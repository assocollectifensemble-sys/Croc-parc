/**
 * Acces a Stripe par appels HTTP directs.
 *
 * Pas de SDK : la bibliotheque officielle traine des dependances Node qui n'ont
 * pas leur place dans un Worker, alors que l'API REST tient en deux fonctions.
 */

export class StripeError extends Error {}

const API = "https://api.stripe.com/v1"

/**
 * Aplatit un objet en corps `application/x-www-form-urlencoded`, seul format
 * accepte par Stripe (`a[b][0][c]=valeur`).
 */
export function encodeForm(valeurs: Record<string, unknown>, prefixe = ""): string {
  const morceaux: string[] = []
  for (const [cle, valeur] of Object.entries(valeurs)) {
    if (valeur === undefined || valeur === null) continue
    const nom = prefixe ? `${prefixe}[${cle}]` : cle
    if (Array.isArray(valeur)) {
      valeur.forEach((element, index) => {
        if (typeof element === "object" && element !== null) {
          morceaux.push(encodeForm(element as Record<string, unknown>, `${nom}[${index}]`))
        } else {
          morceaux.push(`${encodeURIComponent(`${nom}[${index}]`)}=${encodeURIComponent(String(element))}`)
        }
      })
    } else if (typeof valeur === "object") {
      morceaux.push(encodeForm(valeur as Record<string, unknown>, nom))
    } else {
      morceaux.push(`${encodeURIComponent(nom)}=${encodeURIComponent(String(valeur))}`)
    }
  }
  return morceaux.filter(Boolean).join("&")
}

export async function stripeRequest(
  secretKey: string,
  chemin: string,
  corps: Record<string, unknown>,
  cleIdempotence?: string,
): Promise<any> {
  if (!secretKey) throw new StripeError("STRIPE_SECRET_KEY n'est pas configuree")

  const entetes: Record<string, string> = {
    Authorization: `Bearer ${secretKey}`,
    "Content-Type": "application/x-www-form-urlencoded",
  }
  // Stripe rejoue les requetes reseau : sans cle d'idempotence, un client
  // impatient peut creer deux sessions de paiement pour la meme commande.
  if (cleIdempotence) entetes["Idempotency-Key"] = cleIdempotence

  const reponse = await fetch(`${API}${chemin}`, {
    method: "POST",
    headers: entetes,
    body: encodeForm(corps),
  })

  const charge = await reponse.json<any>()
  if (!reponse.ok) {
    throw new StripeError(charge?.error?.message ?? `Stripe a repondu ${reponse.status}`)
  }
  return charge
}

/**
 * Verifie la signature d'un webhook Stripe (en-tete `Stripe-Signature`).
 *
 * Meme principe que notre propre signature : on signe `horodatage.corps`, et on
 * refuse au-dela de la fenetre de tolerance. Implemente a la main pour rester
 * sans dependance, avec une comparaison a temps constant.
 */
export async function verifyWebhook(
  secret: string,
  corps: string,
  entete: string | null,
  toleranceSeconds = 300,
  now?: number,
): Promise<void> {
  if (!secret) throw new StripeError("STRIPE_WEBHOOK_SECRET n'est pas configure")
  if (!entete) throw new StripeError("en-tete Stripe-Signature absent")

  const champs = new Map(
    entete.split(",").map((morceau) => {
      const [cle, ...reste] = morceau.trim().split("=")
      return [cle, reste.join("=")]
    }),
  )
  const horodatage = Number(champs.get("t"))
  if (!Number.isInteger(horodatage)) throw new StripeError("horodatage illisible")

  const maintenant = now ?? Math.floor(Date.now() / 1000)
  if (Math.abs(maintenant - horodatage) > toleranceSeconds) {
    throw new StripeError("horodatage hors fenetre")
  }

  // Stripe peut envoyer plusieurs signatures v1 pendant une rotation de secret.
  const signatures = entete
    .split(",")
    .map((morceau) => morceau.trim())
    .filter((morceau) => morceau.startsWith("v1="))
    .map((morceau) => morceau.slice(3))
  if (signatures.length === 0) throw new StripeError("aucune signature v1")

  const encodeur = new TextEncoder()
  const cle = await crypto.subtle.importKey(
    "raw",
    encodeur.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  )

  for (const signature of signatures) {
    const octets = hexEnOctets(signature)
    if (!octets) continue
    const valide = await crypto.subtle.verify(
      "HMAC",
      cle,
      octets,
      encodeur.encode(`${horodatage}.${corps}`),
    )
    if (valide) return
  }
  throw new StripeError("signature invalide")
}

function hexEnOctets(hex: string): Uint8Array | null {
  const propre = hex.trim().toLowerCase()
  if (propre.length === 0 || propre.length % 2 !== 0 || !/^[0-9a-f]+$/.test(propre)) return null
  const octets = new Uint8Array(propre.length / 2)
  for (let index = 0; index < octets.length; index++) {
    octets[index] = parseInt(propre.substr(index * 2, 2), 16)
  }
  return octets
}
