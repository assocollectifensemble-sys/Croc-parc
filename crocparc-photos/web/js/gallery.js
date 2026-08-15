/** Galerie : grille, visionneuse plein ecran, selection, achat. */

import { CONFIG } from "../config.js";
import {
  activerModeHorsLigne,
  appelerApi,
  codeComplet,
  ErreurVisiteur,
  formaterDate,
  formaterHeure,
  formaterPrix,
  nettoyerCode,
} from "./app.js";

const elements = {
  entete: document.querySelector("#entete"),
  dateVisite: document.querySelector("#date-visite"),
  codeAffiche: document.querySelector("#code-affiche"),
  compte: document.querySelector("#compte"),
  toutSelectionner: document.querySelector("#tout-selectionner"),
  principal: document.querySelector("#principal"),
  chargement: document.querySelector("#chargement"),
  grille: document.querySelector("#grille"),
  pied: document.querySelector("#pied"),
  expiration: document.querySelector("#expiration"),
  barre: document.querySelector("#barre"),
  resumeNombre: document.querySelector("#resume-nombre"),
  resumePrix: document.querySelector("#resume-prix"),
  acheterSelection: document.querySelector("#acheter-selection"),
  acheterTout: document.querySelector("#acheter-tout"),
  visionneuse: document.querySelector("#visionneuse"),
  grandePhoto: document.querySelector("#grande-photo"),
  position: document.querySelector("#position"),
  precedent: document.querySelector("#precedent"),
  suivant: document.querySelector("#suivant"),
  fermer: document.querySelector("#fermer"),
  basculerSelection: document.querySelector("#basculer-selection"),
};

const etat = {
  code: "",
  galerie: null,
  selection: new Set(),
  indexCourant: 0,
};

/** Le code vient de l'URL /g/K7M2QP, ou du parametre ?code= en secours. */
function lireCode() {
  const parametre = new URLSearchParams(window.location.search).get("code");
  const depuisChemin = window.location.pathname.replace(/^\/g\//i, "");
  return nettoyerCode(parametre || depuisChemin);
}

function afficherErreur(message, avecRetour = true) {
  elements.chargement.hidden = true;
  elements.principal.innerHTML = "";
  const bloc = document.createElement("div");
  bloc.className = "vide";
  const texte = document.createElement("p");
  texte.textContent = message;
  bloc.append(texte);
  if (avecRetour) {
    const lien = document.createElement("a");
    lien.className = "bouton";
    lien.href = "/";
    lien.textContent = "Saisir un autre code";
    bloc.append(lien);
  }
  elements.principal.append(bloc);
}

function prixSelection() {
  const tarifs = etat.galerie.pricing;
  const unitaire = etat.selection.size * tarifs.single_cents;
  // Au-dela d'un certain nombre de photos, le forfait est moins cher : on ne
  // laisse jamais un visiteur payer plus cher que le pack.
  return Math.min(unitaire, tarifs.pack_cents);
}

function majSelection() {
  const nombre = etat.selection.size;
  elements.resumeNombre.textContent = nombre === 1 ? "1 photo" : `${nombre} photos`;
  elements.barre.classList.toggle("visible", nombre > 0);
  elements.acheterSelection.disabled = nombre === 0;

  if (nombre > 0) {
    const prix = prixSelection();
    const forfait = prix === etat.galerie.pricing.pack_cents
      && nombre * etat.galerie.pricing.single_cents > prix;
    elements.resumePrix.textContent = forfait
      ? `${formaterPrix(prix)} — tarif visite complete applique`
      : formaterPrix(prix);
  }

  const total = etat.galerie.photos.length;
  elements.toutSelectionner.textContent =
    nombre === total ? "Tout deselectionner" : "Tout selectionner";
}

function basculer(photoId) {
  if (etat.selection.has(photoId)) etat.selection.delete(photoId);
  else etat.selection.add(photoId);

  marquer(photoId, etat.selection.has(photoId));
  majSelection();
  if (elements.visionneuse.open) majVisionneuse();
}

/** Reporte l'etat d'une photo sur sa vignette. */
function marquer(photoId, choisie) {
  const vignette = elements.grille.querySelector(`[data-id="${CSS.escape(photoId)}"]`);
  if (!vignette) return;
  vignette.dataset.choisie = String(choisie);
  vignette.querySelector(".coche")?.setAttribute("aria-pressed", String(choisie));
}

function construireGrille() {
  const fragment = document.createDocumentFragment();
  const total = etat.galerie.photos.length;

  etat.galerie.photos.forEach((photo, index) => {
    const vignette = document.createElement("figure");
    vignette.className = "vignette";
    vignette.dataset.id = photo.id;
    vignette.dataset.choisie = "false";

    const ouvrir = document.createElement("button");
    ouvrir.className = "ouvrir";
    ouvrir.type = "button";
    ouvrir.setAttribute(
      "aria-label",
      `Agrandir la photo ${index + 1} sur ${total}, prise a ${formaterHeure(photo.shot_at)}`,
    );
    ouvrir.addEventListener("click", () => ouvrirVisionneuse(index));

    const image = document.createElement("img");
    image.src = photo.thumb_url;
    image.alt = "";
    image.loading = index < 8 ? "eager" : "lazy";
    image.decoding = "async";
    image.addEventListener("load", () => image.classList.add("chargee"));
    image.addEventListener("error", () => {
      image.classList.add("chargee");
      vignette.style.background = "var(--bordure)";
    });
    ouvrir.append(image);

    const coche = document.createElement("button");
    coche.className = "coche";
    coche.type = "button";
    coche.setAttribute("aria-pressed", "false");
    coche.setAttribute("aria-label", `Selectionner la photo ${index + 1}`);
    coche.addEventListener("click", () => basculer(photo.id));

    vignette.append(ouvrir, coche);
    fragment.append(vignette);
  });

  elements.grille.replaceChildren(fragment);
  elements.grille.hidden = false;
}

/* --- visionneuse ---------------------------------------------------------- */
function majVisionneuse() {
  const photo = etat.galerie.photos[etat.indexCourant];
  elements.grandePhoto.src = photo.preview_url;
  elements.grandePhoto.alt = `Photo prise a ${formaterHeure(photo.shot_at)}`;
  elements.position.textContent =
    `${etat.indexCourant + 1} / ${etat.galerie.photos.length}`;
  elements.precedent.disabled = etat.indexCourant === 0;
  elements.suivant.disabled = etat.indexCourant === etat.galerie.photos.length - 1;

  const choisie = etat.selection.has(photo.id);
  elements.basculerSelection.textContent = choisie ? "Retirer" : "Selectionner";
  elements.basculerSelection.classList.toggle("bouton--fantome", choisie);
}

function ouvrirVisionneuse(index) {
  etat.indexCourant = index;
  majVisionneuse();
  if (!elements.visionneuse.open) elements.visionneuse.showModal();
}

function naviguer(pas) {
  const cible = etat.indexCourant + pas;
  if (cible < 0 || cible >= etat.galerie.photos.length) return;
  ouvrirVisionneuse(cible);
}

elements.precedent.addEventListener("click", () => naviguer(-1));
elements.suivant.addEventListener("click", () => naviguer(1));
elements.fermer.addEventListener("click", () => elements.visionneuse.close());
elements.basculerSelection.addEventListener("click", () =>
  basculer(etat.galerie.photos[etat.indexCourant].id),
);

document.addEventListener("keydown", (evenement) => {
  if (!elements.visionneuse.open) return;
  if (evenement.key === "ArrowLeft") naviguer(-1);
  if (evenement.key === "ArrowRight") naviguer(1);
});

// Balayage horizontal pour passer d'une photo a l'autre.
let departX = null;
elements.visionneuse.addEventListener("touchstart", (evenement) => {
  departX = evenement.changedTouches[0].clientX;
}, { passive: true });

elements.visionneuse.addEventListener("touchend", (evenement) => {
  if (departX === null) return;
  const ecart = evenement.changedTouches[0].clientX - departX;
  if (Math.abs(ecart) > 60) naviguer(ecart < 0 ? 1 : -1);
  departX = null;
}, { passive: true });

/* --- achat ---------------------------------------------------------------- */
async function acheter(produit, photoIds) {
  const boutons = [elements.acheterSelection, elements.acheterTout];
  boutons.forEach((bouton) => (bouton.disabled = true));
  const libelle = elements.acheterTout.textContent;
  elements.acheterTout.textContent = "Redirection…";

  try {
    const reponse = await appelerApi(CONFIG.API.checkout, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: etat.code, product: produit, photo_ids: photoIds }),
    });
    window.location.assign(reponse.url);
  } catch (erreur) {
    const message = erreur instanceof ErreurVisiteur
      ? erreur.message
      : "Le paiement est momentanement indisponible.";
    alert(message);
    boutons.forEach((bouton) => (bouton.disabled = false));
    elements.acheterTout.textContent = libelle;
    majSelection();
  }
}

elements.acheterSelection.addEventListener("click", () => {
  if (etat.selection.size === 0) return;
  const tarifs = etat.galerie.pricing;
  // Si le forfait revient moins cher, on achete le forfait : le visiteur
  // repart avec toutes ses photos pour le meme prix.
  const forfait = etat.selection.size * tarifs.single_cents >= tarifs.pack_cents;
  acheter(forfait ? "pack" : "single", forfait ? [] : [...etat.selection]);
});

elements.acheterTout.addEventListener("click", () => acheter("pack", []));

elements.toutSelectionner.addEventListener("click", () => {
  const tout = etat.selection.size === etat.galerie.photos.length;
  etat.selection = tout ? new Set() : new Set(etat.galerie.photos.map((photo) => photo.id));
  etat.galerie.photos.forEach((photo) => marquer(photo.id, !tout));
  majSelection();
});

/* --- demarrage ------------------------------------------------------------ */
/**
 * Plusieurs visites partagent ce code : on demande laquelle est la sienne
 * plutot que d'en choisir une. Montrer la mauvaise reviendrait a montrer les
 * photos d'une autre famille.
 */
function demanderLaDate(message, dates) {
  elements.chargement.hidden = true;
  elements.principal.innerHTML = "";

  const bloc = document.createElement("div");
  bloc.className = "vide";

  const titre = document.createElement("h2");
  titre.textContent = "Quel jour etes-vous venu ?";
  const texte = document.createElement("p");
  texte.textContent = message;
  bloc.append(titre, texte);

  const choix = document.createElement("div");
  choix.className = "choix-dates";
  dates.forEach((date) => {
    const bouton = document.createElement("button");
    bouton.className = "bouton";
    bouton.type = "button";
    bouton.textContent = formaterDate(date);
    bouton.addEventListener("click", async () => {
      elements.principal.innerHTML = "";
      elements.chargement.hidden = false;
      if (await charger(date)) afficherGalerie();
    });
    choix.append(bouton);
  });
  bloc.append(choix);
  elements.principal.append(bloc);
}

async function charger(date) {
  try {
    etat.galerie = await appelerApi(CONFIG.API.gallery(etat.code, date));
  } catch (erreur) {
    if (erreur instanceof ErreurVisiteur && erreur.genre === "plusieurs") {
      demanderLaDate(erreur.message, erreur.dates);
    } else {
      afficherErreur(
        erreur instanceof ErreurVisiteur
          ? erreur.message
          : "Impossible d'afficher vos photos pour le moment.",
      );
    }
    return false;
  }
  return true;
}

function afficherGalerie() {
  elements.chargement.hidden = true;
  elements.principal.innerHTML = "";
  elements.codeAffiche.textContent = etat.galerie.code;
  elements.dateVisite.textContent = formaterDate(etat.galerie.session_date);
  elements.expiration.textContent = formaterDate(etat.galerie.expires_at);
  elements.entete.hidden = false;
  elements.pied.hidden = false;

  const total = etat.galerie.photos.length;
  elements.compte.textContent = total === 1 ? "1 photo" : `${total} photos`;

  if (total === 0) {
    afficherErreur(
      "Cette galerie ne contient pas encore de photo. Les photos apparaissent quelques minutes apres la visite.",
      false,
    );
    elements.acheterTout.disabled = true;
    elements.toutSelectionner.hidden = true;
    return;
  }

  document.title = `${total} photos du ${formaterDate(etat.galerie.session_date)} - Croc Parc`;
  construireGrille();
  majSelection();
  elements.barre.classList.add("visible");
  elements.resumePrix.textContent =
    `Visite complete : ${formaterPrix(etat.galerie.pricing.pack_cents)}`;
}

async function demarrer() {
  etat.code = lireCode();
  if (!codeComplet(etat.code)) {
    afficherErreur(`Ce lien ne contient pas de code valide a ${CONFIG.CODE_LENGTH} caracteres.`);
    return;
  }
  const dateChoisie = new URLSearchParams(window.location.search).get("date");
  if (await charger(dateChoisie)) afficherGalerie();
}

demarrer();
activerModeHorsLigne();
