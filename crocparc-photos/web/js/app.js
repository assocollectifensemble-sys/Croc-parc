/** Fonctions partagees par les deux pages. */

import { CONFIG } from "../config.js";

/**
 * Ne garde que les caracteres de l'alphabet des cartes, en majuscules.
 * Le visiteur peut donc taper en minuscules, coller une URL complete ou
 * ajouter des espaces sans que ca pose probleme.
 */
export function nettoyerCode(saisie) {
  const brut = String(saisie ?? "").toUpperCase();
  const apresSlash = brut.includes("/") ? brut.slice(brut.lastIndexOf("/") + 1) : brut;
  return [...apresSlash]
    .filter((caractere) => CONFIG.ALPHABET.includes(caractere))
    .join("")
    .slice(0, CONFIG.CODE_LENGTH);
}

export function codeComplet(code) {
  return code.length === CONFIG.CODE_LENGTH;
}

/** Prix en euros, format francais. */
export function formaterPrix(centimes) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" })
    .format(centimes / 100);
}

export function formaterHeure(iso) {
  try {
    return new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" })
      .format(new Date(iso));
  } catch {
    return "";
  }
}

export function formaterDate(iso) {
  try {
    return new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(new Date(iso));
  } catch {
    return iso;
  }
}

/**
 * Appel JSON avec un message d'erreur lisible par un visiteur.
 * On ne distingue jamais « code inconnu » de « galerie expiree » : le serveur
 * renvoie la meme chose dans les deux cas, et l'interface aussi.
 */
export async function appelerApi(url, options = {}) {
  let reponse;
  try {
    reponse = await fetch(url, {
      headers: { Accept: "application/json", ...(options.headers ?? {}) },
      ...options,
    });
  } catch {
    throw new ErreurVisiteur(
      "Connexion impossible. Verifiez votre reseau et reessayez.",
      "reseau",
    );
  }

  if (reponse.status === 429) {
    const attente = Number(reponse.headers.get("Retry-After") ?? 60);
    const minutes = Math.max(1, Math.ceil(attente / 60));
    throw new ErreurVisiteur(
      `Trop d'essais. Reessayez dans ${minutes} minute${minutes > 1 ? "s" : ""}.`,
      "trop",
    );
  }

  if (reponse.status === 404) {
    throw new ErreurVisiteur(
      "Aucune galerie ne correspond a ce code. Verifiez la carte, ou contactez-nous si votre visite date de plus de 30 jours.",
      "introuvable",
    );
  }

  if (!reponse.ok) {
    throw new ErreurVisiteur(
      "Le service est momentanement indisponible. Reessayez dans un instant.",
      "serveur",
    );
  }

  return reponse.json();
}

export class ErreurVisiteur extends Error {
  constructor(message, genre) {
    super(message);
    this.genre = genre;
  }
}

/** Enregistre le service worker, sans bloquer l'affichage. */
export function activerModeHorsLigne() {
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* Sans service worker le site fonctionne, en ligne seulement. */
    });
  });
}
