/**
 * Tarifs, en centimes. **Seule source de verite du prix.**
 *
 * Le client envoie ce qu'il veut acheter, jamais combien ca coute : le montant
 * est toujours recalcule ici avant d'etre envoye a Stripe.
 */

export interface Product {
  id: "single" | "pack"
  label: string
  /** Prix unitaire pour `single`, prix forfaitaire pour `pack`. */
  amountCents: number
}

export const PRODUCTS: Record<Product["id"], Product> = {
  single: { id: "single", label: "Photo a l'unite", amountCents: 500 },
  pack: { id: "pack", label: "Toutes les photos de la visite", amountCents: 2000 },
}

export function isProductId(value: unknown): value is Product["id"] {
  return value === "single" || value === "pack"
}

/**
 * Montant a facturer. `pack` est un forfait : il couvre toutes les photos de la
 * session, quel que soit leur nombre.
 */
export function amountFor(product: Product["id"], photoCount: number): number {
  if (photoCount <= 0) throw new Error("aucune photo selectionnee")
  return product === "pack"
    ? PRODUCTS.pack.amountCents
    : PRODUCTS.single.amountCents * photoCount
}

/** Tarifs exposes a la galerie, pour affichage seulement. */
export function publicPricing() {
  return {
    single_cents: PRODUCTS.single.amountCents,
    pack_cents: PRODUCTS.pack.amountCents,
    currency: "EUR",
  }
}
