/**
 * POST /api/checkout - cree une session de paiement Stripe.
 *
 * Le client dit ce qu'il veut acheter ; **il ne dit jamais combien ca coute**.
 * Le montant est recalcule ici a partir de la table de tarifs et des photos
 * reellement presentes en base. Un client qui envoie `amount` est ignore.
 */

import { amountFor, isProductId, PRODUCTS } from "../_lib/pricing"
import { stripeRequest, StripeError } from "../_lib/stripe"
import { type Env, isGalleryCode, json } from "../_lib/types"

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const MAX_PHOTOS = 200

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  let charge: any
  try {
    charge = await request.json()
  } catch {
    return json(400, { error: "JSON illisible" })
  }

  const code = String(charge?.code ?? "").trim().toUpperCase()
  const produit = charge?.product
  const demandees: unknown = charge?.photo_ids ?? []
  const date = charge?.session_date

  if (!isGalleryCode(code)) return json(404, { error: "galerie introuvable" })
  if (!isProductId(produit)) return json(400, { error: "produit inconnu" })
  if (!Array.isArray(demandees) || demandees.length > MAX_PHOTOS) {
    return json(400, { error: "selection invalide" })
  }
  if (date !== undefined && date !== null && !DATE_PATTERN.test(String(date))) {
    return json(400, { error: "date invalide" })
  }

  const maintenant = new Date().toISOString()
  const { results: sessions } = await env.DB.prepare(
    `SELECT id, session_date FROM sessions
      WHERE code = ? AND status = 'active' AND expires_at > ?
      ORDER BY session_date DESC`,
  )
    .bind(code, maintenant)
    .all<{ id: string; session_date: string }>()

  // Meme regle que la galerie : jamais de choix a la place du visiteur.
  const session = date
    ? sessions.find((candidate) => candidate.session_date === String(date))
    : sessions.length === 1
      ? sessions[0]
      : undefined
  if (!session) return json(404, { error: "galerie introuvable" })

  // Les identifiants viennent du client : on ne garde que ceux qui existent
  // vraiment dans CETTE session. Une photo d'une autre visite est ignoree.
  const { results: photos } = await env.DB.prepare(
    "SELECT id FROM photos WHERE session_id = ? ORDER BY shot_at, filename",
  )
    .bind(session.id)
    .all<{ id: string }>()

  const disponibles = new Set(photos.map((photo) => photo.id))
  const retenues =
    produit === "pack"
      ? [...disponibles]
      : (demandees as unknown[]).map(String).filter((id) => disponibles.has(id))

  if (retenues.length === 0) return json(400, { error: "aucune photo selectionnee" })

  const montant = amountFor(produit, retenues.length)
  const commande = crypto.randomUUID()
  const origine = new URL(request.url).origin

  let paiement: any
  try {
    paiement = await stripeRequest(
      env.STRIPE_SECRET_KEY,
      "/checkout/sessions",
      {
        mode: "payment",
        // Le retour porte l'identifiant de commande : la page de retour peut
        // afficher le telechargement sans attendre le webhook.
        success_url: `${origine}/merci.html?commande=${commande}`,
        cancel_url: `${origine}/g/${code}`,
        client_reference_id: commande,
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: "eur",
              unit_amount: montant,
              product_data: {
                name:
                  produit === "pack"
                    ? `${PRODUCTS.pack.label} — ${retenues.length} photos`
                    : `${retenues.length} photo${retenues.length > 1 ? "s" : ""} de votre visite`,
                description: `Croc Parc, visite du ${session.session_date}`,
              },
            },
          },
        ],
        metadata: { commande, code, session_id: session.id },
      },
      // Idempotence : un double clic ne doit pas creer deux paiements.
      commande,
    )
  } catch (erreur) {
    if (erreur instanceof StripeError) {
      console.error("checkout Stripe", erreur.message)
      return json(502, { error: "paiement indisponible" })
    }
    throw erreur
  }

  await env.DB.prepare(
    `INSERT INTO orders (id, session_id, stripe_session_id, product, photo_ids,
                         amount_cents, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`,
  )
    .bind(
      commande,
      session.id,
      paiement.id,
      produit,
      JSON.stringify(retenues),
      montant,
      maintenant,
    )
    .run()

  return json(200, { url: paiement.url, order_id: commande, amount_cents: montant })
}
