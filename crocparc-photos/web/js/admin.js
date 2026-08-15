/**
 * Console d'administration.
 *
 * Le jeton reste en memoire de session (sessionStorage) : il disparait quand
 * l'onglet se ferme. Aucune donnee de commande n'est stockee cote client.
 */

import { formaterPrix } from "./app.js";

const elements = {
  connexion: document.querySelector("#connexion"),
  jeton: document.querySelector("#jeton"),
  messageConnexion: document.querySelector("#message-connexion"),
  tableau: document.querySelector("#tableau"),
  jour: document.querySelector("#jour"),
  rafraichir: document.querySelector("#rafraichir"),
  deconnexion: document.querySelector("#deconnexion"),
  totaux: document.querySelector("#totaux"),
  sessions: document.querySelector("#sessions"),
  orphelines: document.querySelector("#orphelines"),
  ventes: document.querySelector("#ventes"),
};

const CLE = "crocparc-admin";
let jeton = sessionStorage.getItem(CLE) ?? "";

async function charger() {
  const reponse = await fetch(`/api/admin/overview?date=${elements.jour.value}`, {
    headers: { Authorization: `Bearer ${jeton}` },
  });
  if (reponse.status === 401) {
    throw new Error("Jeton refuse.");
  }
  if (!reponse.ok) throw new Error("Service indisponible.");
  return reponse.json();
}

function tableau(cible, colonnes, lignes, vide) {
  cible.replaceChildren();
  if (lignes.length === 0) {
    const message = document.createElement("caption");
    message.className = "vide-tableau";
    message.textContent = vide;
    cible.append(message);
    return;
  }

  const entete = document.createElement("thead");
  const ligneEntete = document.createElement("tr");
  colonnes.forEach(([titre]) => {
    const cellule = document.createElement("th");
    cellule.textContent = titre;
    ligneEntete.append(cellule);
  });
  entete.append(ligneEntete);

  const corps = document.createElement("tbody");
  lignes.forEach((donnee) => {
    const ligne = document.createElement("tr");
    colonnes.forEach(([, extraire]) => {
      const cellule = document.createElement("td");
      cellule.textContent = extraire(donnee) ?? "—";
      ligne.append(cellule);
    });
    corps.append(ligne);
  });

  cible.append(entete, corps);
}

function afficherTotaux(totaux) {
  const cartes = [
    ["Visites du jour", totaux.sessions_du_jour],
    ["Photos du jour", totaux.photos_du_jour],
    ["Galeries actives", totaux.galeries_actives],
    ["Ventes", totaux.ventes_totales],
    ["Recettes", formaterPrix(totaux.recettes_centimes)],
    ["Paniers abandonnes", totaux.paniers_abandonnes],
  ];
  elements.totaux.replaceChildren(
    ...cartes.map(([titre, valeur]) => {
      const carte = document.createElement("div");
      carte.className = "carte";
      const nombre = document.createElement("strong");
      nombre.textContent = String(valeur);
      const libelle = document.createElement("span");
      libelle.textContent = titre;
      carte.append(nombre, libelle);
      return carte;
    }),
  );
}

function heure(iso) {
  try {
    return new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" })
      .format(new Date(iso));
  } catch {
    return "—";
  }
}

async function afficher() {
  const donnees = await charger();
  afficherTotaux(donnees.totaux);

  tableau(
    elements.sessions,
    [
      ["Code", (s) => s.code],
      ["Carte", (s) => s.card_number ?? "—"],
      ["Photos", (s) => s.photo_count],
      ["Etat", (s) => s.status],
      ["Ouverte a", (s) => heure(s.created_at)],
    ],
    donnees.sessions,
    "Aucune visite ce jour-la.",
  );

  tableau(
    elements.orphelines,
    [
      ["Date", (s) => s.session_date],
      ["Photos", (s) => s.photo_count],
    ],
    donnees.orphelines,
    "Aucune photo sans carte. Tout est bien range.",
  );

  tableau(
    elements.ventes,
    [
      ["Code", (v) => v.code],
      ["Produit", (v) => (v.product === "pack" ? "Visite complete" : "A l'unite")],
      ["Montant", (v) => formaterPrix(v.amount_cents)],
      ["Etat", (v) => (v.status === "paid" ? "payee" : v.status)],
      ["Courriel", (v) => v.email],
      ["Lien actif", (v) => (v.telechargeable ? "oui" : "non")],
    ],
    donnees.ventes,
    "Aucune vente pour l'instant.",
  );
}

async function entrer() {
  try {
    await afficher();
    sessionStorage.setItem(CLE, jeton);
    elements.connexion.hidden = true;
    elements.tableau.hidden = false;
  } catch (erreur) {
    elements.messageConnexion.textContent = erreur.message;
    elements.connexion.hidden = false;
    elements.tableau.hidden = true;
  }
}

elements.connexion.addEventListener("submit", (evenement) => {
  evenement.preventDefault();
  jeton = elements.jeton.value.trim();
  entrer();
});

elements.rafraichir.addEventListener("click", () => afficher());
elements.jour.addEventListener("change", () => afficher());
elements.deconnexion.addEventListener("click", () => {
  sessionStorage.removeItem(CLE);
  window.location.reload();
});

elements.jour.value = new Date().toISOString().slice(0, 10);
if (jeton) entrer();
