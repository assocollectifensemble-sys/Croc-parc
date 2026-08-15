/* ============================================================
   RÉCEPTEUR DE STATISTIQUES — Google Apps Script
   ============================================================
   Alternative GRATUITE ET SANS LIMITE au scénario Make.

   Aujourd'hui l'application envoie vers Make (voir webhookUrl dans
   js/config.js). Make fonctionne très bien mais consomme des
   « opérations » : le forfait Core (10 000 op./mois) tient environ
   400 à 550 parcours d'enfant par mois. Apps Script, lui, est
   illimité — à basculer si le parc devient plus fréquenté.

   ------------------------------------------------------------
   MISE EN PLACE (≈ 5 minutes, dans le navigateur)
   ------------------------------------------------------------
   1. Ouvrir le Google Sheet « Croc Parc — Statistiques » :
      https://docs.google.com/spreadsheets/d/1C4zTFVZAUDOc4WigIsGHOMpIAZOxyXhuciFNyl0wg0g/edit
   2. Menu Extensions → Apps Script.
   3. Coller TOUT ce fichier à la place du contenu existant, puis
      enregistrer (icône disquette).
   4. Bouton bleu « Déployer » → « Nouveau déploiement »
      → type « Application Web »
      → « Exécuter en tant que »   : Moi
      → « Qui a accès »            : Tout le monde   ← indispensable
      → Déployer.
   5. Google demande une autorisation : Autoriser → choisir le compte
      asso.collectif.ensemble@gmail.com → « Paramètres avancés »
      → « Accéder à … (non sécurisé) » → Autoriser.
      (Cet écran d'avertissement est normal pour un script personnel.)
   6. Copier l'URL qui se termine par /exec.
   7. Dans js/config.js, remplacer la valeur de webhookUrl par cette
      URL, incrémenter CACHE_VERSION dans sw.js, redéployer sur
      Netlify. C'est tout — le format d'envoi est identique.
   8. Optionnel : désactiver le scénario Make « Croc Parc —
      Statistiques » pour ne plus rien consommer.

   ------------------------------------------------------------
   Ce script accepte les DEUX formats d'envoi : le formulaire
   (application/x-www-form-urlencoded) utilisé aujourd'hui par
   l'application, et du JSON brut — au cas où l'envoi changerait
   un jour.
   ============================================================ */

var FEUILLE = "Journal";
var FUSEAU = "Indian/Reunion";
var ENTETES = ["Date", "Heure", "Session", "Événement", "Étape",
               "Réponse donnée", "Correct", "Temps (s)", "Détails"];

function doPost(e) {
  try {
    var data = lireDonnees(e);
    var feuille = getFeuille();

    var d = data.date ? new Date(data.date) : new Date();
    if (isNaN(d.getTime())) d = new Date();

    feuille.appendRow([
      Utilities.formatDate(d, FUSEAU, "yyyy-MM-dd"),
      Utilities.formatDate(d, FUSEAU, "HH:mm:ss"),
      data.sessionId || "",
      data.type || "",
      data.stageNom || "",
      data.reponseTexte || "",
      estVrai(data.correct) ? "Oui" : (estFaux(data.correct) ? "Non" : ""),
      secondes(data.tempsMs, data.dureeMs),
      data.details || JSON.stringify(data)
    ]);
  } catch (err) {
    // On ne renvoie jamais d'erreur au téléphone de l'enfant : une
    // statistique perdue ne doit surtout pas casser le parcours.
    console.error(err);
  }
  return ContentService.createTextOutput("OK");
}

/* L'application envoie un formulaire ; on accepte aussi du JSON. */
function lireDonnees(e) {
  if (e && e.parameter && e.parameter.type) return e.parameter;
  if (e && e.postData && e.postData.contents) {
    try { return JSON.parse(e.postData.contents); } catch (err) { /* pas du JSON */ }
  }
  return (e && e.parameter) || {};
}

function getFeuille() {
  var classeur = SpreadsheetApp.getActiveSpreadsheet();
  var feuille = classeur.getSheetByName(FEUILLE);
  if (!feuille) feuille = classeur.insertSheet(FEUILLE);
  if (feuille.getLastRow() === 0) {
    feuille.appendRow(ENTETES);
    feuille.setFrozenRows(1);
  }
  return feuille;
}

function estVrai(v)  { return v === true  || v === "true";  }
function estFaux(v)  { return v === false || v === "false"; }

/* tempsMs = temps passé sur une question ; dureeMs = durée du parcours. */
function secondes(tempsMs, dureeMs) {
  var ms = Number(tempsMs) || Number(dureeMs) || 0;
  return ms > 0 ? Math.round(ms / 1000) : "";
}

/* Ouvrir l'URL /exec dans un navigateur doit afficher ce message :
   c'est le moyen le plus simple de vérifier que le déploiement vit. */
function doGet() {
  return ContentService.createTextOutput(
    "Récepteur de statistiques Croc Parc — en ligne."
  );
}
