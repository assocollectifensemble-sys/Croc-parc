/**
 * Page de retour apres paiement.
 *
 * Elle fonctionne meme si le webhook Stripe n'a pas encore ete traite : dans ce
 * cas on reessaie quelques fois avant d'abandonner, plutot que d'annoncer un
 * echec a quelqu'un qui vient de payer.
 */

import { CONFIG } from "../config.js";
import { appelerApi, ErreurVisiteur, formaterDate } from "./app.js";

const elements = {
  etat: document.querySelector("#etat"),
  zone: document.querySelector("#zone-telechargement"),
  fichiers: document.querySelector("#fichiers"),
  expiration: document.querySelector("#expiration"),
  conserver: document.querySelector("#conserver"),
};

const parametres = new URLSearchParams(window.location.search);
const commande = parametres.get("commande");
let jeton = parametres.get("jeton");

/** Le webhook arrive en general en une seconde, parfois en dix. */
const ATTENTES = [0, 1500, 3000, 5000, 8000, 13000];

function afficher(telechargement) {
  elements.etat.textContent =
    telechargement.photos.length === 1
      ? "Votre photo est prete."
      : `Vos ${telechargement.photos.length} photos sont pretes.`;
  elements.expiration.textContent = formaterDate(telechargement.expires_at);

  const fragment = document.createDocumentFragment();
  telechargement.photos.forEach((photo, index) => {
    const ligne = document.createElement("li");
    const lien = document.createElement("a");
    lien.className = "bouton";
    lien.href = photo.url;
    lien.download = photo.filename;
    lien.textContent = `Telecharger la photo ${index + 1}`;
    ligne.append(lien);
    fragment.append(ligne);
  });
  elements.fichiers.replaceChildren(fragment);
  elements.zone.hidden = false;
  elements.conserver.hidden = false;
}

/**
 * Stripe nous renvoie avec l'identifiant de commande ; le jeton, lui, n'existe
 * qu'une fois le webhook traite. On le reclame donc, et on patiente.
 *
 * L'API distingue les deux cas, et l'interface doit en faire autant : « pas
 * encore confirme » merite qu'on attende, « commande inconnue » merite qu'on le
 * dise tout de suite plutot que de faire patienter une minute pour rien.
 */
class CommandeInconnue extends Error {}

async function obtenirJeton() {
  if (jeton) return jeton;
  if (!commande) return null;
  try {
    const reponse = await appelerApi(CONFIG.API.order(commande));
    if (reponse.token) jeton = reponse.token;
    return jeton;
  } catch (erreur) {
    if (erreur instanceof ErreurVisiteur && erreur.genre === "introuvable") {
      throw new CommandeInconnue();
    }
    throw erreur;
  }
}

async function recuperer() {
  if (!(await obtenirJeton())) return null;
  try {
    return await appelerApi(CONFIG.API.download(jeton));
  } catch (erreur) {
    if (erreur instanceof ErreurVisiteur && erreur.genre === "introuvable") return null;
    throw erreur;
  }
}

async function demarrer() {
  if (!jeton && !commande) {
    elements.etat.textContent = "Ce lien est incomplet. Reprenez celui recu par courriel.";
    return;
  }

  for (const attente of ATTENTES) {
    if (attente) await new Promise((resoudre) => setTimeout(resoudre, attente));
    try {
      const telechargement = await recuperer();
      if (telechargement) {
        afficher(telechargement);
        return;
      }
    } catch (erreur) {
      if (erreur instanceof CommandeInconnue) {
        elements.etat.textContent =
          "Nous ne retrouvons pas cette commande. Utilisez le lien recu par courriel, ou ecrivez-nous.";
        return;
      }
      elements.etat.textContent =
        erreur instanceof ErreurVisiteur
          ? erreur.message
          : "Une erreur est survenue. Reessayez dans un instant.";
      return;
    }
  }

  elements.etat.textContent =
    "Vos photos sont encore en preparation. Rechargez cette page dans une minute — votre achat est bien enregistre, et le lien vous arrive aussi par courriel.";
}

demarrer();
