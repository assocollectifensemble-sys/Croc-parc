/**
 * Authentification de la console d'administration.
 *
 * Un seul secret partage, envoye en Bearer. C'est volontairement modeste : la
 * console sert a une personne, sur un parc, et un systeme de comptes complet
 * serait plus de surface a proteger pour aucun benefice.
 *
 * La comparaison est a temps constant, et un echec coute une seconde : de quoi
 * rendre une attaque par essais successifs sans interet.
 */

import { type Env, json } from "./types"

export class AdminRefuse extends Error {}

const encodeur = new TextEncoder()

async function empreinte(valeur: string): Promise<ArrayBuffer> {
  return crypto.subtle.digest("SHA-256", encodeur.encode(valeur))
}

function memeEmpreinte(a: ArrayBuffer, b: ArrayBuffer): boolean {
  const ua = new Uint8Array(a)
  const ub = new Uint8Array(b)
  if (ua.length !== ub.length) return false
  let difference = 0
  for (let index = 0; index < ua.length; index++) difference |= ua[index] ^ ub[index]
  return difference === 0
}

export async function exigerAdmin(request: Request, env: Env): Promise<void> {
  const attendu = env.ADMIN_TOKEN ?? ""
  if (!attendu) throw new AdminRefuse("ADMIN_TOKEN n'est pas configure")

  const entete = request.headers.get("Authorization") ?? ""
  const fourni = entete.startsWith("Bearer ") ? entete.slice(7) : ""

  const [a, b] = await Promise.all([empreinte(fourni), empreinte(attendu)])
  if (!fourni || !memeEmpreinte(a, b)) {
    await new Promise((resoudre) => setTimeout(resoudre, 1000))
    throw new AdminRefuse("jeton invalide")
  }
}

export function refus(): Response {
  return json(401, { error: "acces refuse" })
}
