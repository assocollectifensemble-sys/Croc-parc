/**
 * Source unique de verite cote client.
 * Aucune autre valeur ne doit etre codee en dur dans les autres fichiers JS.
 */
export const CONFIG = {
  /** Alphabet des codes : ni I, ni O, ni 0, ni 1. */
  ALPHABET: "ABCDEFGHJKLMNPQRSTUVWXYZ23456789",
  CODE_LENGTH: 6,

  API: {
    gallery: (code, date) =>
      `/api/gallery/${encodeURIComponent(code)}` +
      (date ? `?date=${encodeURIComponent(date)}` : ""),
    checkout: "/api/checkout",
    download: (token) => `/api/download/${encodeURIComponent(token)}`,
  },

  /** Duree de vie d'une galerie, affichee au visiteur. */
  RETENTION_DAYS: 30,

  /** Nom du parc, utilise dans les textes et le partage. */
  PARK: "Croc Parc",
  SUPPORT_EMAIL: "photos@crocparc.re",
}
