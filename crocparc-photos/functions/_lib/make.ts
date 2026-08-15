/**
 * Sortie unique vers Make, apres paiement confirme.
 *
 * Make se charge ensuite du mail au client, de la ligne dans Google Sheets et
 * de l'alerte a Jonathan. **L'appel n'est jamais bloquant** : si Make est en
 * panne, la commande reste valide et le client telecharge quand meme depuis la
 * page de retour. On journalise l'echec, on ne le propage pas.
 */

import type { Env } from "./types"

export async function notifierMake(
  env: Env,
  commande: string,
  jeton: string,
  email: string | null,
): Promise<void> {
  if (!env.MAKE_WEBHOOK_URL) return

  const ligne = await env.DB.prepare(
    `SELECT o.product, o.amount_cents, o.photo_ids, s.code, s.session_date
       FROM orders o JOIN sessions s ON s.id = o.session_id
      WHERE o.id = ?`,
  )
    .bind(commande)
    .first<{
      product: string
      amount_cents: number
      photo_ids: string
      code: string
      session_date: string
    }>()
  if (!ligne) return

  const photos = JSON.parse(ligne.photo_ids) as string[]
  const charge = {
    code: ligne.code,
    session_date: ligne.session_date,
    email,
    produit: ligne.product,
    montant_euros: ligne.amount_cents / 100,
    nombre_photos: photos.length,
    lien_telechargement: `${env.PUBLIC_BASE_URL ?? ""}/merci.html?jeton=${jeton}`,
  }

  const reponse = await fetch(env.MAKE_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(charge),
    signal: AbortSignal.timeout(10_000),
  })
  if (!reponse.ok) throw new Error(`Make a repondu ${reponse.status}`)
}
