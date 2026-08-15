/**
 * POST /api/webhook/stripe - Stripe confirme un paiement.
 *
 * Trois exigences :
 *
 * 1. **Idempotent.** Stripe rejoue ses webhooks, parfois plusieurs fois pour le
 *    meme evenement. Repasser une commande en `paid` ne doit rien casser ni
 *    generer un second jeton de telechargement.
 * 2. **Le client repart avec ses photos meme si le reste tombe.** Le jeton est
 *    genere ici ; la remontee des originaux depuis le parc et l'appel a Make
 *    peuvent echouer sans invalider la commande.
 * 3. **Repondre vite.** Stripe considere un webhook lent comme un echec et le
 *    rejoue : le travail annexe part en `waitUntil`.
 */

import { verifyWebhook, StripeError } from "../../_lib/stripe"
import { type Env, json } from "../../_lib/types"
import { fetchOriginals } from "../../_lib/originals"
import { notifierMake } from "../../_lib/make"

export const onRequestPost: PagesFunction<Env> = async ({ request, env, waitUntil }) => {
  const brut = await request.text()

  try {
    await verifyWebhook(env.STRIPE_WEBHOOK_SECRET, brut, request.headers.get("Stripe-Signature"))
  } catch (erreur) {
    if (erreur instanceof StripeError) {
      console.error("webhook refuse", erreur.message)
      return json(400, { error: "signature invalide" })
    }
    throw erreur
  }

  const evenement = JSON.parse(brut)
  // `completed` arrive aussi pour les moyens de paiement a notification
  // differee (prelevement, virement), avec payment_status = "unpaid" : le
  // succes reel arrive alors dans un second evenement.
  const TYPES = ["checkout.session.completed", "checkout.session.async_payment_succeeded"]
  if (!TYPES.includes(evenement.type)) {
    // Tout le reste ne nous concerne pas, mais doit etre acquitte : sinon
    // Stripe rejoue indefiniment.
    return json(200, { ignore: evenement.type })
  }

  const paiement = evenement.data?.object ?? {}
  if (paiement.payment_status !== "paid") {
    // Commande enregistree, argent pas encore encaisse : on ne livre rien.
    return json(200, { ignore: `payment_status=${paiement.payment_status}` })
  }
  const commande = paiement.client_reference_id ?? paiement.metadata?.commande
  if (!commande) return json(200, { ignore: "sans reference de commande" })

  const ligne = await env.DB.prepare(
    "SELECT id, session_id, photo_ids, status, download_token, amount_cents FROM orders WHERE id = ?",
  )
    .bind(commande)
    .first<{
      id: string
      session_id: string
      photo_ids: string
      status: string
      download_token: string | null
      amount_cents: number
    }>()

  if (!ligne) {
    console.error("commande inconnue", commande)
    return json(200, { ignore: "commande inconnue" })
  }

  // Deja traitee : on renvoie le meme jeton, sans rien recreer.
  if (ligne.status === "paid" && ligne.download_token) {
    return json(200, { deja_traite: true, order_id: ligne.id })
  }

  // Le montant encaisse doit etre celui qu'on a calcule. Un ecart signale une
  // session de paiement modifiee ailleurs qu'ici : on ne livre pas.
  const encaisse = Number(paiement.amount_total)
  const devise = String(paiement.currency ?? "").toLowerCase()
  if (encaisse !== ligne.amount_cents || devise !== "eur") {
    console.error(
      `montant inattendu pour ${commande} : ${encaisse} ${devise} au lieu de ${ligne.amount_cents} eur`,
    )
    return json(200, { ignore: "montant inattendu" })
  }

  const jeton = ligne.download_token ?? crypto.randomUUID().replace(/-/g, "")
  const email = paiement.customer_details?.email ?? paiement.customer_email ?? null

  await env.DB.prepare(
    `UPDATE orders SET status = 'paid', paid_at = ?, email = ?, download_token = ?
      WHERE id = ? AND status != 'paid'`,
  )
    .bind(new Date().toISOString(), email, jeton, commande)
    .run()

  // Le reste est du confort : il ne doit ni retarder la reponse a Stripe, ni
  // pouvoir invalider une commande deja payee.
  waitUntil(apresPaiement(env, commande, jeton, email))

  return json(200, { order_id: commande })
}

async function apresPaiement(
  env: Env,
  commande: string,
  jeton: string,
  email: string | null,
): Promise<void> {
  try {
    await fetchOriginals(env, commande)
  } catch (erreur) {
    // Le pont peut etre eteint ou hors ligne : le telechargement les
    // reclamera a la demande, et la commande reste valide.
    console.error("remontee des originaux differee", String(erreur))
  }

  try {
    await notifierMake(env, commande, jeton, email)
  } catch (erreur) {
    console.error("webhook Make en echec, ignore", String(erreur))
  }
}
