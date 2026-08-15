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
  objets_orphelins: number
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
    objets_orphelins: 0,
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

  // Deuxieme passe, par prefixe de date : la jointure sur `photos` ne voit que
  // ce qui a ete declare en base. Une preview deposee sur R2 dont la
  // declaration a echoue -- ou dont la ligne a disparu avec bridge.db -- n'est
  // referencee nulle part et resterait en ligne pour toujours. Les cles
  // commencent par la date de la visite, ce qui suffit a la retrouver.
  bilan.objets_orphelins = await purgerParDate(env, maintenant, bilan)

  // Les compteurs de limitation de debit n'ont pas a s'accumuler.
  const fenetre = Math.floor(maintenant.getTime() / 1000) - 86_400
  const limitations = await env.DB.prepare("DELETE FROM rate_limits WHERE window_start < ?")
    .bind(fenetre)
    .run()
  bilan.limitations = limitations.meta?.changes ?? 0

  return bilan
}

/**
 * Efface tout objet du bucket des previews dont la date de prefixe a depasse la
 * duree de vie, qu'il soit connu de la base ou non.
 *
 * On remonte 400 jours en arriere, largement au-dela de la retention : c'est
 * peu de requetes de listage (une par jour, sur des prefixes vides la plupart
 * du temps) pour la garantie qu'aucune photo d'enfant ne traine dans un bucket
 * public parce qu'une ligne a disparu.
 */
async function purgerParDate(env: Env, maintenant: Date, bilan: Bilan): Promise<number> {
  const RETENTION_JOURS = 30
  const REMONTEE_JOURS = 400
  let effaces = 0

  for (let recul = RETENTION_JOURS + 1; recul <= REMONTEE_JOURS; recul++) {
    const jour = new Date(maintenant.getTime() - recul * 86_400_000)
      .toISOString()
      .slice(0, 10)
    let curseur: string | undefined
    do {
      let liste
      try {
        liste = await env.PREVIEWS.list({ prefix: `${jour}/`, cursor: curseur, limit: 1000 })
      } catch (erreur) {
        bilan.erreurs.push(`listage ${jour} : ${String(erreur)}`)
        break
      }
      for (const objet of liste.objects) {
        try {
          await env.PREVIEWS.delete(objet.key)
          effaces++
        } catch (erreur) {
          bilan.erreurs.push(`orphelin ${objet.key} : ${String(erreur)}`)
        }
      }
      curseur = liste.truncated ? liste.cursor : undefined
    } while (curseur)
  }
  return effaces
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
