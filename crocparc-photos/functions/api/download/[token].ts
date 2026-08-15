/**
 * GET  /api/download/:token         - ce que la commande donne droit a telecharger
 * GET  /api/download/:token/:photo  - le fichier lui-meme
 *
 * Le jeton EST le droit d'acces : il est tire au hasard, lie a une commande
 * payee, et expire avec la session. On ne renvoie jamais d'URL signee R2 :
 * servir le fichier a travers la Function evite de fabriquer des signatures
 * AWS a la main, et le transfert R2 -> Worker ne coute rien.
 *
 * Si l'original n'est pas encore sur R2 -- le pont etait hors ligne au moment
 * du paiement -- on le reclame a la demande, puis on sert. Le client ne voit
 * qu'un telechargement un peu plus lent.
 */

import { fetchOriginals } from "../../_lib/originals"
import { type Env, json } from "../../_lib/types"

const TOKEN_PATTERN = /^[a-f0-9]{32}$/

interface Commande {
  id: string
  session_id: string
  photo_ids: string
  status: string
  expires_at: string
  code: string
}

/** Meme reponse pour un jeton inconnu, revoque ou expire. */
function refuse(): Response {
  return json(404, { error: "telechargement introuvable" })
}

async function chargerCommande(env: Env, jeton: string): Promise<Commande | null> {
  if (!TOKEN_PATTERN.test(jeton)) return null
  return env.DB.prepare(
    `SELECT o.id, o.session_id, o.photo_ids, o.status, s.expires_at, s.code
       FROM orders o JOIN sessions s ON s.id = o.session_id
      WHERE o.download_token = ? AND o.status = 'paid'`,
  )
    .bind(jeton)
    .first<Commande>()
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  const morceaux = Array.isArray(params.token) ? params.token : [String(params.token ?? "")]
  const jeton = morceaux[0] ?? ""
  const photoDemandee = morceaux[1]

  const commande = await chargerCommande(env, jeton)
  if (!commande) return refuse()

  // Le lien meurt avec la galerie : 30 jours apres la visite.
  if (new Date(commande.expires_at) <= new Date()) return refuse()

  const achetees = new Set(JSON.parse(commande.photo_ids) as string[])
  if (achetees.size === 0) return refuse()

  const marques = [...achetees].map(() => "?").join(",")
  const { results: photos } = await env.DB.prepare(
    `SELECT id, filename, original_path FROM photos
      WHERE id IN (${marques}) ORDER BY shot_at, filename`,
  )
    .bind(...achetees)
    .all<{ id: string; filename: string; original_path: string }>()

  // --- la liste ------------------------------------------------------------
  if (!photoDemandee) {
    return json(200, {
      code: commande.code,
      expires_at: commande.expires_at,
      photos: photos.map((photo) => ({
        id: photo.id,
        filename: photo.filename,
        url: `/api/download/${jeton}/${photo.id}`,
      })),
    })
  }

  // --- un fichier ----------------------------------------------------------
  const photo = photos.find((candidate) => candidate.id === photoDemandee)
  if (!photo) return refuse()

  const cle = `originals/${photo.original_path}`
  let objet = await env.ORIGINALS.get(cle)

  if (!objet) {
    // Le pont etait hors ligne au moment du paiement : on le sollicite
    // maintenant. Une commande payee n'attend pas apres une machine.
    try {
      await fetchOriginals(env, commande.id)
      objet = await env.ORIGINALS.get(cle)
    } catch (erreur) {
      console.error("original indisponible", cle, String(erreur))
    }
  }

  if (!objet) {
    return json(503, {
      error: "photo momentanement indisponible",
      message:
        "Vos photos sont en cours de preparation. Reessayez dans quelques minutes, le lien reste valable.",
    })
  }

  const entetes = new Headers()
  objet.writeHttpMetadata(entetes)
  entetes.set("Content-Type", "image/jpeg")
  entetes.set("Content-Disposition", `attachment; filename="${photo.filename}"`)
  entetes.set("Cache-Control", "private, no-store")
  entetes.set("etag", objet.httpEtag)

  return new Response(objet.body, { headers: entetes })
}
