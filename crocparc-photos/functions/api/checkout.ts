/**
 * POST /api/checkout - cree une session de paiement Stripe.
 *
 * Le client dit ce qu'il veut acheter ; **il ne dit jamais combien ca coute**.
 * Le montant est recalcule ici a partir de la table de tarifs et des photos
 * reellement presentes en base. Un client qui envoie `amount` est ignore.
 */

import { amountFor, isProductId, PRODUCTS } from "../_lib/pricing"
import { FAILED_LOOKUPS, clientIp, hit } from "../_lib/ratelimit"
import { stripeRequest, StripeError } from "../_lib/stripe"
import { type Env, isGalleryCode, json } from "../_lib/types"

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const MAX_PHOTOS = 200

/** Empreinte stable d'un panier, pour que deux clics soient un seul paiement. */
async function cleIdempotence(
  sessionId: string,
  produit: string,
  photos: string[],
): Promise<string> {
  const empreinte = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`${sessionId}|${produit}|${[...photos].sort().join(",")}`),
  )
  return [...new Uint8Array(empreinte)]
    .slice(0, 16)
    .map((octet) => octet.toString(16).padStart(2, "0"))
    .join("")
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const ip = clientIp(request)
  if (!ip) return json(503, { error: "service indisponible" })

  // Sans compteur ici, cet endpoint serait un oracle d'enumeration gratuit :
  // « code inconnu » et « code valide mais selection vide » ne rendent pas le
  // meme statut, et la limitation de /api/gallery ne protegerait plus rien.
  const refuser = async (statut: number, corps: Record<string, unknown>) => {
    const limite = await hit(env.DB, env.BRIDGE_SHARED_SECRET, ip, FAILED_LOOKUPS)
    if (!limite.allowed) {
      return new Response(JSON.stringify({ error: "trop de tentatives" }), {
        status: 429,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Retry-After": String(Math.max(1, limite.retryAfter)),
        },
      })
    }
    return json(statut, corps)
  }

  let charge: any
  try {
    charge = await request.json()
  } catch {
    return refuser(400, { error: "JSON illisible" })
  }

  const code = String(charge?.code ?? "").trim().toUpperCase()
  const produit = charge?.product
  const demandees: unknown = charge?.photo_ids ?? []
  const date = charge?.session_date

  if (!isGalleryCode(code)) return refuser(404, { error: "galerie introuvable" })
  if (!isProductId(produit)) return refuser(400, { error: "produit inconnu" })
  if (!Array.isArray(demandees) || demandees.length > MAX_PHOTOS) {
    return refuser(400, { error: "selection invalide" })
  }
  if (date !== undefined && date !== null && !DATE_PATTERN.test(String(date))) {
    return refuser(400, { error: "date invalide" })
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
  if (!session) return refuser(404, { error: "galerie introuvable" })

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

  if (retenues.length === 0) return refuser(400, { error: "aucune photo selectionnee" })

  const montant = amountFor(produit, retenues.length)
  const commande = crypto.randomUUID()
  // Depuis un deploiement de previsualisation, request.url pointe sur une URL
  // temporaire : les retours Stripe doivent viser le site public.
  const origine = (env.PUBLIC_BASE_URL ?? new URL(request.url).origin).replace(/\/+$/, "")

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
      // Idempotence : derivee du contenu de la commande, pas de son
      // identifiant -- sinon deux clics donnent deux cles differentes et la
      // protection ne protege rien.
      await cleIdempotence(session.id, produit, retenues),
    )
  } catch (erreur) {
    if (erreur instanceof StripeError) {
      console.error("checkout Stripe", erreur.message)
      return json(502, { error: "paiement indisponible" })
    }
    throw erreur
  }

  // Grace a la cle d'idempotence, un second clic sur le meme panier renvoie la
  // MEME session Stripe : il faut alors retrouver la commande existante et non
  // en inserer une seconde, sinon la contrainte d'unicite sur
  // stripe_session_id renvoie une erreur au client qui a simplement clique
  // deux fois.
  await env.DB.prepare(
    `INSERT INTO orders (id, session_id, stripe_session_id, product, photo_ids,
                         amount_cents, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)
     ON CONFLICT (stripe_session_id) DO NOTHING`,
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

  const enregistree = await env.DB.prepare(
    "SELECT id, amount_cents FROM orders WHERE stripe_session_id = ?",
  )
    .bind(paiement.id)
    .first<{ id: string; amount_cents: number }>()

  return json(200, {
    url: paiement.url,
    order_id: enregistree?.id ?? commande,
    amount_cents: enregistree?.amount_cents ?? montant,
  })
}
