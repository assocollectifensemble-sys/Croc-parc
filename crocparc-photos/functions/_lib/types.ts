/** Types partages par les Functions. */

export interface Env {
  DB: D1Database
  /** Fichiers statiques du dossier web/, injecte par Cloudflare Pages. */
  ASSETS: Fetcher
  /** Secret partage avec le pont, meme valeur que BRIDGE_SHARED_SECRET. */
  BRIDGE_SHARED_SECRET: string
  /** Duree de vie d'une session, en jours. Defaut : 30. */
  SESSION_TTL_DAYS?: string
  /** Base publique du bucket des previews (domaine R2 ou domaine personnalise). */
  PREVIEWS_BASE_URL?: string

  /** Bucket prive des originaux vendus. */
  ORIGINALS: R2Bucket

  // --- Paiement -------------------------------------------------------------
  STRIPE_SECRET_KEY: string
  STRIPE_WEBHOOK_SECRET: string

  // --- Pont du parc ---------------------------------------------------------
  /** URL de POST /fetch-original, exposee par le tunnel Cloudflare. */
  BRIDGE_FETCH_URL?: string

  // --- Automatisations ------------------------------------------------------
  /** Webhook Make, appele apres paiement. Son absence n'est pas une erreur. */
  MAKE_WEBHOOK_URL?: string
  /** Base publique du site, utilisee dans les liens envoyes a Make. */
  PUBLIC_BASE_URL?: string

  /** Jeton de la console d'administration. */
  ADMIN_TOKEN?: string
}

export interface IngestPhoto {
  filename: string
  shot_at: string
  preview_key: string
  thumb_key: string
  /** Chemin relatif de l'original sur le mini-PC du parc. */
  original_path: string
  width?: number | null
  height?: number | null
}

export interface IngestPayload {
  code: string
  card_number?: number | null
  session_date: string
  photos: IngestPhoto[]
}

/** Alphabet des codes de carte : ni I, ni O, ni 0, ni 1. */
export const CODE_PATTERN = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/
/**
 * Code interne des photos arrivees avant toute carte. Il contient un `O`,
 * absent de l'alphabet : aucune carte reelle ne peut le porter, et aucun
 * visiteur ne peut le saisir dans la galerie.
 */
export const ORPHAN_CODE = "ORPHAN"

/**
 * Code saisissable par un visiteur. **Strict** : ORPHAN n'en fait pas partie.
 * C'est cette fonction que doit utiliser toute surface publique.
 */
export function isGalleryCode(code: unknown): code is string {
  return typeof code === "string" && CODE_PATTERN.test(code)
}

/**
 * Code accepte par l'ingestion, qui doit pouvoir declarer la session
 * technique des photos arrivees avant toute carte.
 */
export function isIngestCode(code: unknown): code is string {
  return isGalleryCode(code) || code === ORPHAN_CODE
}

export function json(status: number, payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      // Une reponse de galerie porte les URLs des photos d'une famille : aucun
      // intermediaire ne doit la garder. `web/_headers` ne couvre pas de
      // maniere fiable les reponses des Functions, on le pose donc ici.
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  })
}
