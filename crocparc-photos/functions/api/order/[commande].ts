/**
 * GET /api/order/:commande - le jeton de telechargement d'une commande payee.
 *
 * Sans cet endpoint, un client qui paie ne recoit rien : Stripe le renvoie sur
 * `/merci.html?commande=<uuid>`, et le jeton n'existe qu'apres le webhook. Le
 * courriel de Make est un second canal, pas le seul.
 *
 * L'identifiant de commande est un UUID v4 tire au hasard, connu du seul
 * acheteur (il est dans son URL de retour) : il vaut le jeton en entropie. Il
 * ne donne rien de plus que le jeton lui-meme, et les essais sont comptes.
 */

import { FAILED_LOOKUPS, clientIp, hit } from "../../_lib/ratelimit"
import { type Env, json } from "../../_lib/types"

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  const ip = clientIp(request)
  if (!ip) return json(503, { error: "service indisponible" })

  const commande = String(params.commande ?? "").trim()
  const echec = async () => {
    const limite = await hit(env.DB, env.BRIDGE_SHARED_SECRET, ip, FAILED_LOOKUPS)
    return limite.allowed
      ? json(404, { error: "commande introuvable" })
      : json(429, { error: "trop de tentatives" })
  }

  if (!UUID_PATTERN.test(commande)) return echec()

  const ligne = await env.DB.prepare(
    "SELECT status, download_token FROM orders WHERE id = ?",
  )
    .bind(commande)
    .first<{ status: string; download_token: string | null }>()

  if (!ligne) return echec()

  // Paiement pas encore confirme par Stripe : ce n'est pas une erreur, c'est
  // une attente. La page de retour reessaie.
  if (ligne.status !== "paid" || !ligne.download_token) {
    return json(202, { status: ligne.status, message: "paiement en cours de confirmation" })
  }

  return json(200, { status: "paid", token: ligne.download_token })
}
