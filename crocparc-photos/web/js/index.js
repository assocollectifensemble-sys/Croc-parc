/** Page de saisie du code. */

import { CONFIG } from "../config.js";
import { activerModeHorsLigne, codeComplet, nettoyerCode } from "./app.js";

const champ = document.querySelector("#code");
const bouton = document.querySelector("#valider");
const message = document.querySelector("#message");
const formulaire = document.querySelector("#formulaire");

function rafraichir() {
  const complet = codeComplet(champ.value);
  bouton.disabled = !complet;
  if (complet) message.textContent = "";
}

champ.addEventListener("input", () => {
  const position = champ.selectionStart;
  const avant = champ.value;
  champ.value = nettoyerCode(avant);
  if (champ.value !== avant) {
    champ.setSelectionRange(position - (avant.length - champ.value.length), position);
  }
  champ.classList.remove("erreur");
  rafraichir();
});

// Coller l'URL complete du QR code doit marcher aussi bien que taper le code.
champ.addEventListener("paste", (evenement) => {
  evenement.preventDefault();
  champ.value = nettoyerCode(evenement.clipboardData.getData("text"));
  rafraichir();
});

formulaire.addEventListener("submit", (evenement) => {
  evenement.preventDefault();
  const code = nettoyerCode(champ.value);
  if (!codeComplet(code)) {
    champ.classList.add("erreur");
    message.textContent = `Le code compte ${CONFIG.CODE_LENGTH} caracteres.`;
    champ.focus();
    return;
  }
  // La verification se fait dans la galerie : une seule requete, un seul
  // endroit ou gerer les erreurs.
  window.location.assign(`/g/${code}`);
});

champ.focus();
rafraichir();
activerModeHorsLigne();
