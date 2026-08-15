/** Types partages par les Functions. */

export interface Env {
  DB: D1Database
  /** Secret partage avec le pont, meme valeur que BRIDGE_SHARED_SECRET. */
  BRIDGE_SHARED_SECRET: string
  /** Duree de vie d'une session, en jours. Defaut : 30. */
  SESSION_TTL_DAYS?: string
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

export function isValidCode(code: unknown): code is string {
  return typeof code === "string" && (CODE_PATTERN.test(code) || code === ORPHAN_CODE)
}

export function json(status: number, payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  })
}
