/**
 * GET /api/gallery/:code - les photos d'une visite.
 *
 * Quatre regles non negociables :
 *
 * 1. **Pas d'oracle.** Un code inexistant, un code expire, une session
 *    orpheline et un code mal forme renvoient exactement la meme reponse. Rien
 *    ne doit permettre de distinguer « ce code n'existe pas » de « ce code
 *    existe mais n'est plus actif ».
 * 2. **Jamais la galerie d'une autre famille.** Les cartes sont physiques et
 *    reutilisables : deux visites du meme code peuvent cohabiter tant que la
 *    premiere n'a pas expire. Dans ce cas on ne devine pas, on demande la date
 *    de visite -- servir « la plus recente » reviendrait a montrer les enfants
 *    d'inconnus a la premiere famille.
 * 3. **Jamais de chemin d'original.** Uniquement previews et vignettes.
 * 4. **Limitation de debit** sur les echecs, pour rendre l'enumeration vaine.
 */

import { FAILED_LOOKUPS, SUCCESSFUL_LOOKUPS, clientIp, hit } from "../../_lib/ratelimit"
import { publicPricing } from "../../_lib/pricing"
import { type Env, isGalleryCode, json } from "../../_lib/types"

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

interface SessionRow {
  id: string
  code: string
  session_date: string
  expires_at: string
}

/** Reponse unique pour tous les cas de refus. Aucune information ne fuit. */
function introuvable(): Response {
  return json(404, { error: "galerie introuvable" })
}

function trop(retryAfter: number): Response {
  return new Response(
    JSON.stringify({ error: "trop de tentatives", retry_after: retryAfter }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Retry-After": String(Math.max(1, retryAfter)),
      },
    },
  )
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  const ip = clientIp(request)
  const code = String(params.code ?? "").trim().toUpperCase()
  const dateDemandee = new URL(request.url).searchParams.get("date")

  const echec = async () => {
    const limite = await hit(env.DB, env.BRIDGE_SHARED_SECRET, ip, FAILED_LOOKUPS)
    return limite.allowed ? introuvable() : trop(limite.retryAfter)
  }

  // Un code mal forme ne merite pas une requete en base, mais il compte comme
  // un echec : sinon il suffirait d'envoyer du bruit pour sonder gratuitement.
  if (!isGalleryCode(code)) return echec()
  if (dateDemandee !== null && !DATE_PATTERN.test(dateDemandee)) return echec()

  const succes = await hit(env.DB, env.BRIDGE_SHARED_SECRET, ip, SUCCESSFUL_LOOKUPS)
  if (!succes.allowed) return trop(succes.retryAfter)

  const maintenant = new Date().toISOString()
  const { results: sessions } = await env.DB.prepare(
    `SELECT id, code, session_date, expires_at
       FROM sessions
      WHERE code = ? AND status = 'active' AND expires_at > ?
      ORDER BY session_date DESC`,
  )
    .bind(code, maintenant)
    .all<SessionRow>()

  if (sessions.length === 0) return echec()

  let session: SessionRow | undefined
  if (sessions.length === 1) {
    session = sessions[0]
  } else if (dateDemandee) {
    session = sessions.find((candidate) => candidate.session_date === dateDemandee)
    if (!session) return echec()
  } else {
    // Cette carte a servi plusieurs fois pendant sa duree de vie. On ne choisit
    // pas a la place du visiteur : il indique le jour de sa visite.
    return json(409, {
      error: "plusieurs visites",
      message:
        "Cette carte a servi pour plusieurs visites. Indiquez le jour de la votre.",
      dates: sessions.map((candidate) => candidate.session_date),
    })
  }

  const { results } = await env.DB.prepare(
    `SELECT id, shot_at, preview_key, thumb_key, width, height
       FROM photos WHERE session_id = ? ORDER BY shot_at, filename`,
  )
    .bind(session.id)
    .all<{
      id: string
      shot_at: string
      preview_key: string
      thumb_key: string
      width: number | null
      height: number | null
    }>()

  const base = (env.PREVIEWS_BASE_URL ?? "").replace(/\/+$/, "")
  if (!base) {
    // Sans base publique, toutes les images seraient des chemins relatifs sur
    // le domaine Pages : une galerie vide, en apparence normale. Mieux vaut
    // une panne franche.
    console.error("PREVIEWS_BASE_URL n'est pas configure")
    return json(500, { error: "service indisponible" })
  }

  return json(200, {
    code: session.code,
    session_date: session.session_date,
    expires_at: session.expires_at,
    pricing: publicPricing(),
    photos: results.map((photo) => ({
      id: photo.id,
      shot_at: photo.shot_at,
      width: photo.width,
      height: photo.height,
      preview_url: `${base}/${photo.preview_key}`,
      thumb_url: `${base}/${photo.thumb_key}`,
    })),
  })
}
