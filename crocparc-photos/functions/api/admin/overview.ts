/**
 * GET /api/admin/overview - ce que Jonathan et la photographe ont besoin de voir.
 *
 * Une seule requete pour toute la console : sessions du jour, sessions
 * orphelines, incidents, ventes. Le tableau de bord doit tenir sur un ecran de
 * telephone, entre deux groupes.
 */

import { AdminRefuse, exigerAdmin, refus } from "../../_lib/admin"
import { type Env, json } from "../../_lib/types"

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    await exigerAdmin(request, env)
  } catch (erreur) {
    if (erreur instanceof AdminRefuse) return refus()
    throw erreur
  }

  const url = new URL(request.url)
  const jour = url.searchParams.get("date") ?? new Date().toISOString().slice(0, 10)
  const maintenant = new Date().toISOString()

  const [sessions, orphelines, ventes, totaux] = await Promise.all([
    env.DB.prepare(
      `SELECT id, code, card_number, session_date, photo_count, status, created_at
         FROM sessions WHERE session_date = ? ORDER BY created_at`,
    )
      .bind(jour)
      .all(),

    // Les sessions orphelines sont invisibles du public : c'est ici, et
    // seulement ici, qu'on peut s'apercevoir qu'un QR n'a pas ete lu.
    env.DB.prepare(
      `SELECT id, session_date, photo_count, created_at
         FROM sessions WHERE code = 'ORPHAN' AND status != 'purged'
        ORDER BY session_date DESC LIMIT 30`,
    ).all(),

    env.DB.prepare(
      `SELECT o.id, o.product, o.amount_cents, o.status, o.created_at, o.paid_at,
              o.email, s.code, s.session_date,
              (o.download_token IS NOT NULL) AS telechargeable
         FROM orders o JOIN sessions s ON s.id = o.session_id
        ORDER BY o.created_at DESC LIMIT 40`,
    ).all(),

    env.DB.prepare(
      `SELECT
         (SELECT COUNT(*) FROM sessions WHERE session_date = ?) AS sessions_du_jour,
         (SELECT COUNT(*) FROM photos p JOIN sessions s ON s.id = p.session_id
           WHERE s.session_date = ?) AS photos_du_jour,
         (SELECT COUNT(*) FROM sessions WHERE status = 'active' AND expires_at > ?) AS galeries_actives,
         (SELECT COUNT(*) FROM orders WHERE status = 'paid') AS ventes_totales,
         (SELECT COALESCE(SUM(amount_cents), 0) FROM orders WHERE status = 'paid') AS recettes_centimes,
         (SELECT COUNT(*) FROM orders WHERE status = 'pending') AS paniers_abandonnes`,
    )
      .bind(jour, jour, maintenant)
      .first(),
  ])

  return json(200, {
    date: jour,
    totaux,
    sessions: sessions.results,
    orphelines: orphelines.results,
    ventes: ventes.results,
  })
}
