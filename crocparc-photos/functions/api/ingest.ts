/**
 * POST /api/ingest - le pont declare une session et ses photos.
 *
 * Authentifie par HMAC-SHA256 (voir _lib/signing.ts), horodatage de moins de
 * 5 minutes. **Idempotent** : le pont rejoue apres chaque coupure reseau, et
 * rejouer la meme charge utile ne doit jamais creer de doublon. L'unicite est
 * garantie par la base : (code, session_date) pour les sessions,
 * (session_id, filename) pour les photos.
 */

import { SIGNATURE_HEADER, SignatureError, TIMESTAMP_HEADER, verify } from "../_lib/signing"
import { type Env, type IngestPayload, type IngestPhoto, isIngestCode, json } from "../_lib/types"

const MAX_BODY_BYTES = 1024 * 1024
const MAX_PHOTOS = 500
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

class InvalidPayload extends Error {}

function requireString(value: unknown, champ: string, maxLength = 512): string {
  if (typeof value !== "string" || value.length === 0 || value.length > maxLength) {
    throw new InvalidPayload(`champ ${champ} invalide`)
  }
  return value
}

function requireKey(value: unknown, champ: string): string {
  const cle = requireString(value, champ)
  // Une cle R2 ou un chemin d'archive reste relatif : pas d'echappatoire.
  if (cle.startsWith("/") || cle.includes("..") || cle.includes("\\")) {
    throw new InvalidPayload(`champ ${champ} invalide`)
  }
  return cle
}

function requireDimension(value: unknown, champ: string): number | null {
  if (value === null || value === undefined) return null
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0 || value > 100000) {
    throw new InvalidPayload(`champ ${champ} invalide`)
  }
  return value
}

function parsePayload(brut: unknown): IngestPayload {
  if (typeof brut !== "object" || brut === null) throw new InvalidPayload("corps JSON attendu")
  const charge = brut as Record<string, unknown>

  const code = charge.code
  if (!isIngestCode(code)) throw new InvalidPayload("code de carte invalide")

  const sessionDate = requireString(charge.session_date, "session_date", 10)
  if (!DATE_PATTERN.test(sessionDate) || Number.isNaN(Date.parse(sessionDate))) {
    throw new InvalidPayload("session_date invalide")
  }

  const cardNumber = charge.card_number
  if (cardNumber !== null && cardNumber !== undefined && !Number.isInteger(cardNumber)) {
    throw new InvalidPayload("card_number invalide")
  }

  if (!Array.isArray(charge.photos)) throw new InvalidPayload("photos doit etre un tableau")
  if (charge.photos.length > MAX_PHOTOS) throw new InvalidPayload("trop de photos en un appel")

  const photos: IngestPhoto[] = charge.photos.map((brute: unknown) => {
    if (typeof brute !== "object" || brute === null) throw new InvalidPayload("photo invalide")
    const photo = brute as Record<string, unknown>
    return {
      filename: requireString(photo.filename, "filename", 255),
      shot_at: requireString(photo.shot_at, "shot_at", 40),
      preview_key: requireKey(photo.preview_key, "preview_key"),
      thumb_key: requireKey(photo.thumb_key, "thumb_key"),
      original_path: requireKey(photo.original_path, "original_path"),
      width: requireDimension(photo.width, "width"),
      height: requireDimension(photo.height, "height"),
    }
  })

  return {
    code: code as string,
    card_number: (cardNumber as number | null | undefined) ?? null,
    session_date: sessionDate,
    photos,
  }
}

/** Cree la session si elle n'existe pas, puis retourne son identifiant. */
async function ensureSession(
  env: Env,
  charge: IngestPayload,
  maintenant: Date,
): Promise<{ id: string; created: boolean }> {
  const existante = await env.DB.prepare(
    "SELECT id FROM sessions WHERE code = ? AND session_date = ?",
  )
    .bind(charge.code, charge.session_date)
    .first<{ id: string }>()

  if (existante) {
    if (charge.card_number !== null) {
      await env.DB.prepare(
        "UPDATE sessions SET card_number = ? WHERE id = ? AND card_number IS NULL",
      )
        .bind(charge.card_number, existante.id)
        .run()
    }
    return { id: existante.id, created: false }
  }

  const ttl = Number(env.SESSION_TTL_DAYS ?? "30") || 30
  const expire = new Date(maintenant.getTime() + ttl * 86_400_000)
  const id = crypto.randomUUID()
  const statut = charge.code === "ORPHAN" ? "orphan" : "active"

  // ON CONFLICT : deux appels simultanes pour la meme carte ne doivent pas
  // faire echouer le second, ils doivent converger sur la meme session.
  await env.DB.prepare(
    `INSERT INTO sessions (id, code, card_number, session_date, created_at, expires_at,
                           photo_count, status)
     VALUES (?, ?, ?, ?, ?, ?, 0, ?)
     ON CONFLICT (code, session_date) DO NOTHING`,
  )
    .bind(
      id,
      charge.code,
      charge.card_number,
      charge.session_date,
      maintenant.toISOString(),
      expire.toISOString(),
      statut,
    )
    .run()

  const ligne = await env.DB.prepare(
    "SELECT id FROM sessions WHERE code = ? AND session_date = ?",
  )
    .bind(charge.code, charge.session_date)
    .first<{ id: string }>()
  if (!ligne) throw new Error("session introuvable apres insertion")
  return { id: ligne.id, created: ligne.id === id }
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const taille = Number(request.headers.get("Content-Length") ?? "0")
  if (taille > MAX_BODY_BYTES) return json(413, { error: "charge utile trop volumineuse" })

  // Le corps brut sert au calcul de la signature : il doit etre lu tel quel,
  // avant tout parsing.
  const brut = await request.text()
  if (brut.length > MAX_BODY_BYTES) return json(413, { error: "charge utile trop volumineuse" })

  try {
    await verify(
      env.BRIDGE_SHARED_SECRET,
      brut,
      request.headers.get(TIMESTAMP_HEADER),
      request.headers.get(SIGNATURE_HEADER),
    )
  } catch (erreur) {
    if (erreur instanceof SignatureError) return json(401, { error: "signature invalide" })
    throw erreur
  }

  let charge: IngestPayload
  try {
    charge = parsePayload(JSON.parse(brut))
  } catch (erreur) {
    const message = erreur instanceof InvalidPayload ? erreur.message : "JSON illisible"
    return json(400, { error: message })
  }

  const maintenant = new Date()
  const session = await ensureSession(env, charge, maintenant)

  let inserted = 0
  if (charge.photos.length > 0) {
    const horodatage = maintenant.toISOString()
    const resultats = await env.DB.batch(
      charge.photos.map((photo) =>
        env.DB.prepare(
          `INSERT OR IGNORE INTO photos (id, session_id, filename, shot_at, preview_key,
                                         thumb_key, original_path, width, height, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ).bind(
          crypto.randomUUID(),
          session.id,
          photo.filename,
          photo.shot_at,
          photo.preview_key,
          photo.thumb_key,
          photo.original_path,
          photo.width,
          photo.height,
          horodatage,
        ),
      ),
    )
    inserted = resultats.reduce((total, resultat) => total + (resultat.meta?.changes ?? 0), 0)
  }

  // Le compteur est recalcule, jamais incremente : un rejeu ne doit pas le gonfler.
  await env.DB.prepare(
    "UPDATE sessions SET photo_count = (SELECT COUNT(*) FROM photos WHERE session_id = ?) WHERE id = ?",
  )
    .bind(session.id, session.id)
    .run()

  return json(200, {
    session_id: session.id,
    session_created: session.created,
    inserted,
    skipped: charge.photos.length - inserted,
  })
}
