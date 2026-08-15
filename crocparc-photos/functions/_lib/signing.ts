/**
 * Signature HMAC partagee avec le pont Python (voir bridge/src/bridge/signing.py).
 *
 * On signe `timestamp.corps_brut` et non le corps seul : sinon un horodatage
 * peut etre remplace sans invalider la signature, et la fenetre de 5 minutes ne
 * protege plus de rien. Meme approche que les webhooks Stripe.
 *
 * Les deux implementations sont verrouillees par un vecteur de test commun,
 * present dans les tests Python et TypeScript.
 */

export const TIMESTAMP_HEADER = "X-Bridge-Timestamp"
export const SIGNATURE_HEADER = "X-Bridge-Signature"
export const MAX_SKEW_SECONDS = 300

export class SignatureError extends Error {}

const encoder = new TextEncoder()

async function hmacKey(secret: string, usage: "sign" | "verify"): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    [usage],
  )
}

function toHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, "0")).join("")
}

function fromHex(hex: string): Uint8Array | null {
  const clean = hex.trim().toLowerCase()
  if (clean.length === 0 || clean.length % 2 !== 0 || !/^[0-9a-f]+$/.test(clean)) return null
  const bytes = new Uint8Array(clean.length / 2)
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(clean.substr(i * 2, 2), 16)
  return bytes
}

/** Signe un corps brut. Retourne les deux en-tetes a envoyer. */
export async function sign(
  secret: string,
  body: string,
  timestamp?: number,
): Promise<{ timestamp: string; signature: string }> {
  if (!secret) throw new SignatureError("secret partage vide : refus de signer")
  const stamp = String(timestamp ?? Math.floor(Date.now() / 1000))
  const key = await hmacKey(secret, "sign")
  const digest = await crypto.subtle.sign("HMAC", key, encoder.encode(`${stamp}.${body}`))
  return { timestamp: stamp, signature: toHex(digest) }
}

/**
 * Verifie une requete signee. Leve SignatureError si elle n'est pas authentique
 * ou si son horodatage est trop ancien.
 *
 * La comparaison passe par crypto.subtle.verify, donc a temps constant : une
 * comparaison de chaines fuirait la signature attendue octet par octet.
 */
export async function verify(
  secret: string,
  body: string,
  timestamp: string | null,
  signature: string | null,
  now?: number,
  maxSkew = MAX_SKEW_SECONDS,
): Promise<void> {
  if (!secret) throw new SignatureError("secret partage non configure")
  if (!timestamp || !signature) throw new SignatureError("en-tetes de signature manquants")

  const stamp = Number(timestamp)
  if (!Number.isInteger(stamp)) throw new SignatureError("horodatage illisible")

  const maintenant = now ?? Math.floor(Date.now() / 1000)
  if (Math.abs(maintenant - stamp) > maxSkew) {
    throw new SignatureError(
      `horodatage hors fenetre (${Math.abs(Math.round(maintenant - stamp))} s d'ecart)`,
    )
  }

  const bytes = fromHex(signature)
  if (!bytes) throw new SignatureError("signature malformee")

  const key = await hmacKey(secret, "verify")
  const ok = await crypto.subtle.verify("HMAC", key, bytes, encoder.encode(`${stamp}.${body}`))
  if (!ok) throw new SignatureError("signature invalide")
}
