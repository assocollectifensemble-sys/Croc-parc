/**
 * Limitation de debit par adresse IP, adossee a D1.
 *
 * Deux compteurs distincts, parce qu'ils protegent de deux choses differentes :
 *
 * - les **echecs** (code inconnu) sont limites a 10 par 10 minutes : c'est ce
 *   qui rend l'enumeration des codes inutile. 32^6 combinaisons a 10 essais par
 *   dix minutes, personne ne tombera sur une galerie par hasard.
 * - les **succes** sont limites plus largement : une famille qui recharge sa
 *   galerie ne doit jamais etre bloquee, mais on ne veut pas non plus qu'un
 *   code fuite serve a aspirer le site en boucle.
 *
 * L'adresse IP n'est jamais stockee : seule une empreinte HMAC sert de cle.
 */

const encoder = new TextEncoder()

export interface RateLimitRule {
  /** Nom du compteur, pour separer echecs et succes. */
  name: string
  /** Nombre d'evenements autorises dans la fenetre. */
  limit: number
  /** Duree de la fenetre, en secondes. */
  windowSeconds: number
}

/**
 * Un seau par surface : dix mauvais jetons d'administration ne doivent pas
 * verrouiller la galerie pour toute l'adresse du parc.
 */
export function echecs(surface: string, limit = 10): RateLimitRule {
  return { name: `miss:${surface}`, limit, windowSeconds: 600 }
}

/** Compat : saisie de code dans la galerie. */
export const FAILED_LOOKUPS: RateLimitRule = echecs("gallery")

export const SUCCESSFUL_LOOKUPS: RateLimitRule = {
  name: "hit",
  limit: 120,
  windowSeconds: 600,
}

/**
 * Adresse de l'appelant telle que Cloudflare la voit.
 *
 * Uniquement `CF-Connecting-IP` : `X-Forwarded-For` est fourni par le client et
 * permettrait de changer de seau a chaque requete. En son absence -- ce qui ne
 * doit pas arriver derriere Cloudflare -- on retourne null, et l'appelant
 * refuse de servir plutot que de mettre tout le monde dans le meme seau.
 */
export function clientIp(request: Request): string | null {
  return request.headers.get("CF-Connecting-IP")
}

async function bucketKey(secret: string, ip: string, rule: RateLimitRule): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret || "sel-par-defaut"),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  )
  const digest = await crypto.subtle.sign("HMAC", key, encoder.encode(`${rule.name}:${ip}`))
  return [...new Uint8Array(digest)]
    .slice(0, 16)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

/**
 * Compte un evenement et dit s'il faut refuser.
 *
 * Le compteur est incremente AVANT la reponse : en cas de doute on prefere
 * bloquer un essai de trop plutot qu'un de moins.
 */
export async function hit(
  db: D1Database,
  secret: string,
  ip: string,
  rule: RateLimitRule,
  now: number = Math.floor(Date.now() / 1000),
): Promise<{ allowed: boolean; remaining: number; retryAfter: number }> {
  const fenetre = Math.floor(now / rule.windowSeconds) * rule.windowSeconds
  const bucket = await bucketKey(secret, ip, rule)

  await db
    .prepare(
      `INSERT INTO rate_limits (bucket, window_start, count) VALUES (?, ?, 1)
       ON CONFLICT (bucket, window_start) DO UPDATE SET count = count + 1`,
    )
    .bind(bucket, fenetre)
    .run()

  const ligne = await db
    .prepare("SELECT count FROM rate_limits WHERE bucket = ? AND window_start = ?")
    .bind(bucket, fenetre)
    .first<{ count: number }>()

  const compte = ligne?.count ?? 1
  return {
    allowed: compte <= rule.limit,
    remaining: Math.max(0, rule.limit - compte),
    retryAfter: fenetre + rule.windowSeconds - now,
  }
}

/** Efface les fenetres passees. Appele par le Worker de purge. */
export async function forget(db: D1Database, before: number): Promise<number> {
  const resultat = await db
    .prepare("DELETE FROM rate_limits WHERE window_start < ?")
    .bind(before)
    .run()
  return resultat.meta?.changes ?? 0
}
