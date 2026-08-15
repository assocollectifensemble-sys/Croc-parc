/**
 * Worker planifie : efface tout ce qui a depasse 30 jours.
 *
 * Ce que promet la page d'accueil au visiteur -- « vos photos sont effacees au
 * bout de 30 jours » -- n'est vrai que si quelque chose l'execute. C'est ici.
 *
 * Ordre volontaire : on efface d'abord les objets R2, ensuite les lignes. Si le
 * Worker s'arrete au milieu, il reste des lignes pointant vers des objets
 * disparus (galerie vide, sans danger) plutot que des objets publics dont plus
 * aucune ligne ne garde la trace (photos d'enfants orphelines, indefiniment
 * accessibles a qui connait l'URL).
 */

export interface Env {
  DB: D1Database
  PREVIEWS: R2Bucket
  ORIGINALS: R2Bucket
}

interface Bilan {
  sessions: number
  photos: number
  objets_previews: number
  objets_originaux: number
  commandes: number
  limitations: number
  erreurs: string[]
}

/** Sessions expirees, par lots : une journee chargee peut en compter beaucoup. */
const LOT = 50

export async function purger(env: Env, maintenant = new Date()): Promise<Bilan> {
  const bilan: Bilan = {
    sessions: 0,
    photos: 0,
    objets_previews: 0,
    objets_originaux: 0,
    commandes: 0,
    limitations: 0,
    erreurs: [],
  }
  const horodatage = maintenant.toISOString()

  for (;;) {
    const { results: sessions } = await env.DB.prepare(
      `SELECT id, code, session_date FROM sessions
        WHERE expires_at <= ? AND status != 'purged'
        LIMIT ?`,
    )
      .bind(horodatage, LOT)
      .all<{ id: string; code: string; session_date: string }>()

    if (sessions.length === 0) break

    for (const session of sessions) {
      const { results: photos } = await env.DB.prepare(
        "SELECT id, preview_key, thumb_key, original_path FROM photos WHERE session_id = ?",
      )
        .bind(session.id)
        .all<{ id: string; preview_key: string; thumb_key: string; original_path: string }>()

      for (const photo of photos) {
        for (const cle of [photo.preview_key, photo.thumb_key]) {
          try {
            await env.PREVIEWS.delete(cle)
            bilan.objets_previews++
          } catch (erreur) {
            bilan.erreurs.push(`preview ${cle} : ${String(erreur)}`)
          }
        }
        try {
          // L'original n'est sur R2 que s'il a ete vendu ; supprimer une cle
          // absente ne coute rien.
          await env.ORIGINALS.delete(`originals/${photo.original_path}`)
          bilan.objets_originaux++
        } catch (erreur) {
          bilan.erreurs.push(`original ${photo.original_path} : ${String(erreur)}`)
        }
      }

      // Les commandes gardent leur trace comptable (montant, date, produit),
      // mais perdent tout ce qui touche a la famille : plus de jeton, donc plus
      // de telechargement, et plus d'adresse electronique. Sans la condition
      // sur le jeton, les paniers abandonnes sont nettoyes eux aussi.
      const commandes = await env.DB.prepare(
        "UPDATE orders SET download_token = NULL, photo_ids = '[]', email = NULL WHERE session_id = ?",
      )
        .bind(session.id)
        .run()
      bilan.commandes += commandes.meta?.changes ?? 0

      const effacees = await env.DB.prepare("DELETE FROM photos WHERE session_id = ?")
        .bind(session.id)
        .run()
      bilan.photos += effacees.meta?.changes ?? 0

      await env.DB.prepare(
        "UPDATE sessions SET status = 'purged', photo_count = 0 WHERE id = ?",
      )
        .bind(session.id)
        .run()
      bilan.sessions++
    }
  }

  // Les compteurs de limitation de debit n'ont pas a s'accumuler.
  const fenetre = Math.floor(maintenant.getTime() / 1000) - 86_400
  const limitations = await env.DB.prepare("DELETE FROM rate_limits WHERE window_start < ?")
    .bind(fenetre)
    .run()
  bilan.limitations = limitations.meta?.changes ?? 0

  return bilan
}

export default {
  async scheduled(_evenement: ScheduledController, env: Env): Promise<void> {
    const bilan = await purger(env)
    console.log("purge terminee", JSON.stringify(bilan))
    if (bilan.erreurs.length > 0) {
      // Les erreurs n'arretent pas la purge : elles doivent rester visibles
      // dans les journaux du Worker.
      console.error(`${bilan.erreurs.length} erreur(s) pendant la purge`)
    }
  },
}
