/**
 * Remontee des originaux vendus depuis le mini-PC du parc.
 *
 * Les originaux ne quittent le parc qu'une fois payes : on appelle
 * `POST /fetch-original` sur le pont, signe avec le meme secret que
 * `/api/ingest`, et le pont depose les fichiers demandes dans le bucket prive.
 *
 * Si le pont est injoignable, ce n'est pas un echec de commande : le
 * telechargement reessaiera. C'est le prix a payer pour ne pas stocker 15 Mo
 * par photo sur R2 avant la moindre vente.
 */

import { SIGNATURE_HEADER, TIMESTAMP_HEADER, sign } from "./signing"
import type { Env } from "./types"

export interface OriginalPousse {
  key: string
  bytes: number
}

/** Chemins des originaux d'une commande, tels que stockes par le pont. */
export async function cheminsDeLaCommande(env: Env, commande: string): Promise<string[]> {
  const ligne = await env.DB.prepare("SELECT photo_ids FROM orders WHERE id = ?")
    .bind(commande)
    .first<{ photo_ids: string }>()
  if (!ligne) return []

  const ids = JSON.parse(ligne.photo_ids) as string[]
  if (ids.length === 0) return []

  const marques = ids.map(() => "?").join(",")
  const { results } = await env.DB.prepare(
    `SELECT original_path FROM photos WHERE id IN (${marques})`,
  )
    .bind(...ids)
    .all<{ original_path: string }>()
  return results.map((photo) => photo.original_path)
}

/**
 * Demande au pont de deposer sur R2 les originaux de cette commande.
 * Retourne la correspondance chemin -> cle R2.
 */
export async function fetchOriginals(
  env: Env,
  commande: string,
): Promise<Record<string, OriginalPousse>> {
  const chemins = await cheminsDeLaCommande(env, commande)
  if (chemins.length === 0) return {}
  if (!env.BRIDGE_FETCH_URL) throw new Error("BRIDGE_FETCH_URL n'est pas configure")

  const corps = JSON.stringify({ paths: chemins })
  const { timestamp, signature } = await sign(env.BRIDGE_SHARED_SECRET, corps)

  const reponse = await fetch(env.BRIDGE_FETCH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      [TIMESTAMP_HEADER]: timestamp,
      [SIGNATURE_HEADER]: signature,
    },
    body: corps,
    // Le pont est au bout d'un tunnel, sur une connexion de parc animalier :
    // on lui laisse du temps, mais pas indefiniment.
    signal: AbortSignal.timeout(60_000),
  })

  if (!reponse.ok) {
    throw new Error(`le pont a repondu ${reponse.status}`)
  }
  const charge = await reponse.json<{ originals: Record<string, OriginalPousse> }>()
  return charge.originals ?? {}
}
