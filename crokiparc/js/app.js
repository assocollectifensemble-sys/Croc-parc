/* ============================================================
   APP.JS — Logique principale du jeu
   ============================================================ */

let CFG = null;
let etat = {
  stageIndex: 0,
  visited: [],
  lettreParStage: [],
  voiceOn: true,
  essaisRates: [],
  resultat: null,
  arrive: false,
  audioUnlocked: false,
  tempsDebutSession: 0,
  sessionId: "",
  tempsDebutEtape: 0,
  mapZoom: 1
};

function genererSessionId() {
  return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
}

function tracker(payload) {
  CrokiStorage.ajouterEvenement({ sessionId: etat.sessionId, ...payload });
}

function melanger(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const IMG = name => `assets/img/${name}.webp`;

function boldHTML(str) {
  return String(str).replace(/\*\*(.+?)\*\*/g, '<strong class="hint-mot">$1</strong>');
}
function plainText(str) {
  return String(str).replace(/\*\*(.+?)\*\*/g, '$1');
}

/* ---------------------------------------------------------
   INITIALISATION
--------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  CFG = CrokiStorage.getConfig();
  document.getElementById("img-plan-parc").src = CFG.parc.planImage;
  wireHistoire();
  wireResumeScreen();
  wireStageScreen();
  wireFinalScreen();
  wirePinScreen();
  wireInstallApp();
  CrokiAdmin.init();
  CrokiScene.setDefault();
  CrokiScene.startParticles();

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }

  const p = CrokiStorage.getProgress();
  if (p && p.visited.length < CFG.stages.length) {
    document.getElementById("reprise-txt").textContent =
      `Tu en étais à l'étape ${p.stageIndex + 1}/${CFG.stages.length} — ${CFG.stages[p.stageIndex]?.nom || ""}.`;
    showScreen("screen-resume");
  } else {
    showScreen("screen-histoire");
    demarrerAccueil();
  }
});

/* ---------------------------------------------------------
   VOIX — système générique utilisé partout dans l'appli
--------------------------------------------------------- */
let currentAudioEl = null;
function stopAllVoice() {
  window.speechSynthesis?.cancel();
  if (currentAudioEl) { currentAudioEl.pause(); currentAudioEl.currentTime = 0; }
}

async function direTexte(cle, texteSecours, forcer = false) {
  if (!etat.voiceOn && !forcer) return;
  const blob = cle ? await CrokiDB.getAudio(cle).catch(() => null) : null;
  if (blob) playAudioBlob(blob);
  // Pas d'enregistrement disponible : on reste silencieux, jamais de voix robot.
}

function playAudioBlob(blob) {
  try {
    if (currentAudioEl) { currentAudioEl.pause(); currentAudioEl = null; }
    currentAudioEl = new Audio(URL.createObjectURL(blob));
    currentAudioEl.play().catch(() => {});
  } catch (e) {}
}

function showScreen(id) {
  stopAllVoice();
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  window.scrollTo(0, 0);
  requestAnimationFrame(() => window.scrollTo(0, 0));
  setTimeout(() => window.scrollTo(0, 0), 50);
}

function unlockAudio() {
  if (etat.audioUnlocked) return;
  try { new Audio().play().catch(() => {}); } catch (e) {}
  etat.audioUnlocked = true;
}

/* ---------------------------------------------------------
   INSTALLATION DE L'APP (PWA)
--------------------------------------------------------- */
function wireInstallApp() {
  const estStandalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  if (estStandalone) {
    document.getElementById("bloc-install-done").style.display = "block";
    return;
  }
  let deferredPrompt = null;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    document.getElementById("btn-installer-app").style.display = "block";
  });
  document.getElementById("btn-installer-app").addEventListener("click", async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const choix = await deferredPrompt.userChoice;
    deferredPrompt = null;
    document.getElementById("btn-installer-app").style.display = "none";
    if (choix.outcome === "accepted") document.getElementById("bloc-install-done").style.display = "block";
  });
  window.addEventListener("appinstalled", () => {
    document.getElementById("btn-installer-app").style.display = "none";
    document.getElementById("bloc-install-ios").style.display = "none";
    document.getElementById("bloc-install-done").style.display = "block";
  });
  const estIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
  if (estIOS) document.getElementById("bloc-install-ios").style.display = "block";
}

/* ---------------------------------------------------------
   ACCUEIL — une seule page, droit au but
--------------------------------------------------------- */
function demarrerAccueil() {
  document.getElementById("histoire-texte").innerHTML = boldHTML(CFG.histoireAccueil.texte);
  direTexte(CFG.histoireAccueil.cle, CFG.histoireAccueil.texte);
}

function wireHistoire() {
  document.getElementById("btn-ecouter-histoire").addEventListener("click", () => {
    direTexte(CFG.histoireAccueil.cle, CFG.histoireAccueil.texte, true);
  });
  document.getElementById("btn-ouvrir-admin").addEventListener("click", () => CrokiAdmin.demanderAcces());

  document.getElementById("toggle-voix").addEventListener("click", () => {
    etat.voiceOn = !etat.voiceOn;
    document.getElementById("toggle-voix").classList.toggle("on", etat.voiceOn);
    if (!etat.voiceOn) window.speechSynthesis?.cancel();
  });

  document.getElementById("btn-demarrer").addEventListener("click", () => {
    unlockAudio();
    tracker({ type: "app_ouverte" });
    showScreen("screen-video");
    lancerVideoIntro();
  });

  document.getElementById("btn-decouvrir-parcours").addEventListener("click", demarrerParcours);
}

/* ---------------------------------------------------------
   VIDÉO "C'EST PARTI" (une seule lecture) puis découverte du parcours
--------------------------------------------------------- */
function lancerVideoIntro() {
  document.getElementById("carte-rendezvous").style.display = "none";
  document.getElementById("btn-decouvrir-parcours").style.display = "none";
  const vid = document.getElementById("histoire-video");
  vid.muted = false;
  vid.currentTime = 0;
  vid.play().catch(() => { vid.muted = true; vid.play().catch(() => {}); });
  direTexte(CFG.histoireVideo.cle, CFG.histoireVideo.texte);
  vid.onended = afficherDecouvrirParcours;
  // Si la vidéo met du temps à démarrer, on ne bloque pas l'enfant plus de 6 secondes
  setTimeout(() => { if (document.getElementById("carte-rendezvous").style.display === "none") afficherDecouvrirParcours(); }, 6000);
}

function afficherDecouvrirParcours() {
  const carte = document.getElementById("carte-rendezvous");
  if (carte.style.display === "block") return; // déjà affiché
  carte.style.display = "block";
  document.getElementById("btn-decouvrir-parcours").style.display = "block";
  document.getElementById("img-plan-parc-decouverte").src = CFG.parc.planImage;
  document.getElementById("txt-carte-explication-video").textContent = CFG.carteExplication.texte;
  const premiere = CFG.stages[0];
  document.getElementById("txt-rendezvous-panneau").textContent = "🐊 " + plainText(premiere.transition);
  direTexte(CFG.carteExplication.cle, CFG.carteExplication.texte);
  setTimeout(() => direTexte(`${premiere.id}__transition`, premiere.transition), 3200);
}

/* ---------------------------------------------------------
   ÉCRAN REPRISE
--------------------------------------------------------- */
function wireResumeScreen() {
  document.getElementById("btn-reprendre").addEventListener("click", () => {
    unlockAudio();
    reprendreParcours();
  });
  document.getElementById("btn-recommencer-zero").addEventListener("click", () => {
    CrokiStorage.resetProgress();
    showScreen("screen-histoire");
    demarrerAccueil();
  });
}

/* ---------------------------------------------------------
   DÉMARRAGE / REPRISE DU PARCOURS (sans GPS — carte numérotée)
--------------------------------------------------------- */
function demarrerParcours() {
  etat.stageIndex = 0;
  etat.visited = [];
  etat.lettreParStage = CFG.motCible.split(""); // fixe : chaque étape correspond à sa lettre (assortie à l'accessoire)
  etat.tempsDebutSession = Date.now();
  etat.sessionId = genererSessionId();
  tracker({ type: "session_start" });
  showScreen("screen-stage");
  resetZoomCarte();
  goToStage(0);
  sauvegarderProgression();
}

function reprendreParcours() {
  const p = CrokiStorage.getProgress();
  if (!p) return;
  etat.stageIndex = p.stageIndex;
  etat.visited = p.visited;
  etat.lettreParStage = p.lettreParStage;
  etat.tempsDebutSession = Date.now();
  etat.sessionId = p.sessionId || genererSessionId();
  tracker({ type: "session_reprise", stageIndex: etat.stageIndex });
  showScreen("screen-stage");
  goToStage(etat.stageIndex);
}

function sauvegarderProgression() {
  CrokiStorage.saveProgress({
    stageIndex: etat.stageIndex,
    visited: etat.visited, lettreParStage: etat.lettreParStage,
    sessionId: etat.sessionId
  });
}

/* ---------------------------------------------------------
   MOT CROKI — tuiles de lettres
--------------------------------------------------------- */
function renderMotTiles(targetId) {
  const wrap = document.getElementById(targetId);
  if (!wrap) return;
  wrap.innerHTML = "";
  CFG.stages.forEach((s, i) => {
    const d = document.createElement("div");
    const gagnee = etat.visited.includes(s.id);
    d.className = "mot-tile" + (gagnee ? " gagnee" : (i === etat.stageIndex ? " actuelle" : ""));
    d.textContent = gagnee ? etat.lettreParStage[i] : "?";
    wrap.appendChild(d);
  });
}

/* ---------------------------------------------------------
   NAVIGATION ENTRE ÉTAPES
--------------------------------------------------------- */
function setHeroImage(imgId, heroWrapId, stage) {
  const img = document.getElementById(imgId);
  const wrap = document.getElementById(heroWrapId);
  img.src = IMG(stage.crokiImage);
  if (wrap) wrap.classList.toggle("scene-complete", !!stage.crokiScene);
}

function goToStage(index) {
  etat.stageIndex = index;
  etat.arrive = false;
  etat.essaisRates = [];
  etat.resultat = null;
  etat.tempsDebutEtape = Date.now();
  stopAllVoice();

  const stage = CFG.stages[index];
  CrokiScene.setForStage(stage);
  tracker({ type: "stage_enter", stageId: stage.id, stageNom: stage.nom, index });

  document.getElementById("txt-hdr-sub").textContent = `Étape ${index + 1} / ${CFG.stages.length}`;

  document.getElementById("bloc-approche").style.display = "block";
  document.getElementById("bloc-question").style.display = "none";
  setHeroImage("img-approche", "hero-approche", stage);
  document.getElementById("txt-approche-bulle").innerHTML = boldHTML(stage.intro);

  renderMotTiles("mot-tiles");
  sauvegarderProgression();
}

function arriverSurEtape() {
  if (etat.arrive) return;
  etat.arrive = true;
  const stage = CFG.stages[etat.stageIndex];

  document.getElementById("bloc-approche").style.display = "none";
  document.getElementById("bloc-question").style.display = "block";

  document.getElementById("txt-zone-emoji").textContent = stage.emoji;
  document.getElementById("txt-zone-emoji").style.background = stage.couleur + "33";
  document.getElementById("txt-zone-num").textContent = "Étape " + (etat.stageIndex + 1);
  document.getElementById("txt-zone-num").style.color = stage.couleur;
  document.getElementById("txt-zone-nom").textContent = stage.nom;
  document.getElementById("txt-ing-tag").textContent = "🎁 Accessoire à gagner : " + stage.accessoireEmoji + " " + stage.accessoire;
  document.querySelector("#bloc-question .card-zone").style.borderColor = stage.couleur + "66";

  setHeroImage("img-question", "hero-question", stage);
  document.getElementById("img-question").className = "croki-img question";
  document.getElementById("txt-question-bulle").innerHTML = boldHTML(stage.intro);
  document.getElementById("txt-question-bulle").className = "bulle";
  document.getElementById("txt-question").innerHTML = "❓ " + boldHTML(stage.question.texte);

  const wrap = document.getElementById("wrap-options");
  wrap.innerHTML = "";
  stage.question.options.forEach((opt, i) => {
    const btn = document.createElement("button");
    btn.className = "option";
    btn.innerHTML = `<span class="option-lettre">${["A","B","C","D"][i]}</span>${boldHTML(opt)}`;
    btn.addEventListener("click", () => choisirOption(i));
    wrap.appendChild(btn);
  });

  document.getElementById("bloc-explication").style.display = "none";
  document.getElementById("reward-pop").style.display = "none";
  document.getElementById("btn-suivant").style.display = "none";

  direTexte(`${stage.id}__question`, plainText(stage.intro) + " … " + plainText(stage.question.texte));
}

function wireStageScreen() {
  document.getElementById("btn-force-arrivee").addEventListener("click", arriverSurEtape);

  wireZoomCarte();

  document.getElementById("btn-reecouter").addEventListener("click", () => {
    const stage = CFG.stages[etat.stageIndex];
    if (!etat.arrive) { direTexte(`${stage.id}__transition`, stage.transition, true); return; }
    if (etat.resultat === "bonne") direTexte(`${stage.id}__resultat`, "Brav Super Marmaille ! " + plainText(stage.question.explication), true);
    else direTexte(`${stage.id}__question`, plainText(stage.intro) + " … " + plainText(stage.question.texte), true);
  });

  document.getElementById("btn-suivant").addEventListener("click", stageSuivante);
}

/* ---------------------------------------------------------
   CARTE — zoom
--------------------------------------------------------- */
function wireZoomCarte() {
  document.getElementById("btn-zoom-plus").addEventListener("click", () => appliquerZoomCarte(0.35));
  document.getElementById("btn-zoom-moins").addEventListener("click", () => appliquerZoomCarte(-0.35));
  document.getElementById("btn-zoom-reset").addEventListener("click", ouvrirCartePleinEcran);
  document.getElementById("img-plan-parc").addEventListener("dblclick", () => appliquerZoomCarte(etat.mapZoom > 1.3 ? -10 : 1));
  document.getElementById("btn-fermer-map-plein-ecran").addEventListener("click", () => {
    document.getElementById("map-fullscreen-overlay").classList.remove("show");
  });
}
function ouvrirCartePleinEcran() {
  document.getElementById("img-plan-parc-plein-ecran").src = CFG.parc.planImage;
  document.getElementById("map-fullscreen-overlay").classList.add("show");
}
function appliquerZoomCarte(delta) {
  etat.mapZoom = Math.min(3, Math.max(1, etat.mapZoom + delta));
  document.getElementById("map-wrap").style.width = (etat.mapZoom * 100) + "%";
}
function resetZoomCarte() {
  etat.mapZoom = 1;
  document.getElementById("map-wrap").style.width = "100%";
}

/* ---------------------------------------------------------
   QUESTIONS / RÉPONSES — essais multiples autorisés
--------------------------------------------------------- */
function choisirOption(index) {
  const stage = CFG.stages[etat.stageIndex];
  if (etat.resultat === "bonne") return;
  if (etat.essaisRates.includes(index)) return;

  const bonne = index === stage.question.bonne;
  const boutons = document.querySelectorAll(".option");
  const btn = boutons[index];

  tracker({
    type: "reponse", stageId: stage.id, stageNom: stage.nom,
    reponseTexte: stage.question.options[index], optionIndex: index, correct: bonne,
    tempsMs: Date.now() - etat.tempsDebutEtape
  });

  if (!bonne) {
    etat.essaisRates.push(index);
    btn.classList.add("mauvaise");
    btn.querySelector(".option-lettre").textContent = "✗";
    btn.disabled = true; btn.style.cursor = "default";

    playError();
    const img = document.getElementById("img-question");
    img.src = IMG("croki-hesite"); img.className = "croki-img shake";
    setTimeout(() => { img.className = "croki-img question"; img.src = IMG(stage.crokiImage); }, 750);

    const messages = ["Héhé, presque ! Essaie encore, marmaille !", "Pas tout à fait… Réfléchis bien, tu vas trouver !", "Ohh, pas celle-là ! Encore un essai ?"];
    document.getElementById("txt-question-bulle").textContent = messages[Math.min(etat.essaisRates.length - 1, messages.length - 1)];
    document.getElementById("txt-question-bulle").className = "bulle bulle-mauvaise";
    return;
  }

  etat.resultat = "bonne";
  btn.classList.add("bonne");
  btn.querySelector(".option-lettre").textContent = "✓";
  document.querySelectorAll(".option").forEach(b => { b.disabled = true; b.style.cursor = "default"; });

  playSuccess();
  CrokiScene.starburst();
  CrokiScene.flashPulse();

  const img = document.getElementById("img-question");
  img.src = IMG("croki-victoire-peace"); img.className = "croki-img bounce";
  setTimeout(() => { img.className = "croki-img question"; img.src = IMG(stage.crokiImage); }, 1000);

  const exp = document.getElementById("bloc-explication");
  exp.className = "explication bonne";
  exp.style.display = "block";
  document.getElementById("txt-explication-titre").textContent = "🎉 Bravo, Super Marmaille !";
  document.getElementById("txt-explication-texte").innerHTML = boldHTML(stage.question.explication);

  document.getElementById("txt-question-bulle").textContent = "Brav ! Brav ! To lé trop fort marmaille ! Allez, on continue !";
  document.getElementById("txt-question-bulle").className = "bulle bulle-bonne";

  const rp = document.getElementById("reward-pop");
  rp.style.display = "block";
  document.getElementById("reward-emoji").textContent = stage.accessoireEmoji;
  document.getElementById("reward-titre").textContent = "Tu gagnes : " + stage.accessoire + " !";
  document.getElementById("reward-lettre").textContent = "🔤 Lettre débloquée : " + etat.lettreParStage[etat.stageIndex];

  const bs = document.getElementById("btn-suivant");
  bs.style.display = "block";
  bs.style.background = stage.couleur;
  const suivante = CFG.stages[etat.stageIndex + 1];
  bs.textContent = suivante ? "Étape suivante : " + suivante.nom + " →" : "🎊 Voir la fête de Croki !";

  lancerConfettis(14);
  tracker({
    type: "stage_complete", stageId: stage.id, stageNom: stage.nom,
    tempsMs: Date.now() - etat.tempsDebutEtape, essaisRates: etat.essaisRates.length
  });
  direTexte(`${stage.id}__resultat`, "Brav Super Marmaille ! " + plainText(stage.question.explication));
}

async function stageSuivante() {
  if (etat.resultat === "bonne") etat.visited.push(CFG.stages[etat.stageIndex].id);
  stopAllVoice();
  renderMotTiles("mot-tiles");

  if (etat.stageIndex + 1 >= CFG.stages.length) {
    afficherFinal();
    return;
  }
  const next = CFG.stages[etat.stageIndex + 1];
  playVroom();
  direTexte(`${next.id}__transition`, next.transition, true);
  await CrokiScene.showTransition(plainText(next.transition));
  goToStage(etat.stageIndex + 1);
}

/* ---------------------------------------------------------
   ÉCRAN FINAL — mini-jeu de remise en ordre puis célébration
--------------------------------------------------------- */
let puzzle = { slots: [], chips: [] };

function wireFinalScreen() {
  document.getElementById("btn-jai-vu-animateur").addEventListener("click", demarrerCelebration);

  document.getElementById("btn-recommencer").addEventListener("click", () => {
    const vid = document.getElementById("video-outro");
    vid.pause(); vid.currentTime = 0;
    etat.stageIndex = 0;
    etat.visited = [];
    CrokiStorage.resetProgress();
    document.getElementById("final-puzzle-phase").style.display = "block";
    document.getElementById("final-animateur-phase").style.display = "none";
    document.getElementById("final-celebration-phase").style.display = "none";
    CrokiScene.setDefault();
    showScreen("screen-histoire");
    demarrerAccueil();
  });

  document.getElementById("btn-replay-outro").addEventListener("click", () => {
    const vid = document.getElementById("video-outro");
    vid.currentTime = 0;
    vid.play().catch(() => {});
  });

  const lienContact = document.getElementById("lien-contact-cache");
  const sujet = encodeURIComponent("Demande d'infos — application pour mon parc");
  const corps = encodeURIComponent(
    "Bonjour,\n\nJ'ai vu l'application interactive Croc Parc et j'aimerais avoir plus d'informations pour développer une application similaire pour notre structure.\n\nMerci d'avance,"
  );
  lienContact.href = `mailto:asso.collectif.ensemble@gmail.com?subject=${sujet}&body=${corps}`;
}

function afficherFinal() {
  showScreen("screen-final");
  document.getElementById("final-puzzle-phase").style.display = "block";
  document.getElementById("final-animateur-phase").style.display = "none";
  document.getElementById("final-celebration-phase").style.display = "none";
  document.getElementById("puzzle-hint").textContent = "";
  document.getElementById("txt-enigme").innerHTML = boldHTML(CFG.enigmeFinale.texte);
  puzzle.slots = new Array(CFG.motCible.length).fill(null);
  puzzle.chips = melanger(etat.lettreParStage);
  renderPuzzle();
  direTexte(CFG.enigmeFinale.cle, CFG.enigmeFinale.texte);
}

function renderPuzzle() {
  const slotsEl = document.getElementById("puzzle-slots");
  slotsEl.innerHTML = "";
  puzzle.slots.forEach((lettre, i) => {
    const d = document.createElement("div");
    let cls = "puzzle-slot" + (lettre ? " filled" : "");
    if (lettre) cls += (lettre === CFG.motCible[i]) ? " correct" : " incorrect";
    d.className = cls;
    d.textContent = lettre || "";
    d.addEventListener("click", () => retirerSlot(i));
    slotsEl.appendChild(d);
  });
  const chipsEl = document.getElementById("puzzle-chips");
  chipsEl.innerHTML = "";
  puzzle.chips.forEach((lettre, i) => {
    const b = document.createElement("button");
    b.className = "puzzle-chip"; b.type = "button"; b.textContent = lettre;
    b.addEventListener("click", () => poserChip(i));
    chipsEl.appendChild(b);
  });
}

function poserChip(chipIndex) {
  const videIdx = puzzle.slots.findIndex(s => s === null);
  if (videIdx === -1) return;
  const lettre = puzzle.chips[chipIndex];
  puzzle.slots[videIdx] = lettre;
  puzzle.chips.splice(chipIndex, 1);
  document.getElementById("puzzle-hint").textContent = "";
  renderPuzzle();
  if (puzzle.slots.every(s => s !== null)) verifierPuzzle();
}

function retirerSlot(slotIndex) {
  const lettre = puzzle.slots[slotIndex];
  if (!lettre) return;
  puzzle.slots[slotIndex] = null;
  puzzle.chips.push(lettre);
  document.getElementById("puzzle-hint").textContent = "";
  renderPuzzle();
}

function verifierPuzzle() {
  const tentative = puzzle.slots.join("");
  const hint = document.getElementById("puzzle-hint");
  tracker({ type: "puzzle_tentative", correct: tentative === CFG.motCible });
  if (tentative === CFG.motCible) {
    hint.textContent = "";
    playSuccess();
    CrokiScene.starburst();
    setTimeout(afficherVaVoirAnimateur, 600);
  } else {
    playError();
    hint.textContent = "Pas encore… tape une lettre pour la reposer, et réessaie !";
    document.querySelectorAll(".puzzle-slot").forEach(el => el.classList.add("shake"));
    setTimeout(() => document.querySelectorAll(".puzzle-slot").forEach(el => el.classList.remove("shake")), 400);
  }
}

function afficherVaVoirAnimateur() {
  document.getElementById("final-puzzle-phase").style.display = "none";
  document.getElementById("final-animateur-phase").style.display = "block";
  document.getElementById("txt-mot-secret-trouve").textContent = CFG.motCible;
  document.getElementById("txt-va-voir-animateur").textContent = CFG.vaVoirAnimateur.texte;
  lancerConfettis(24);
  direTexte(CFG.vaVoirAnimateur.cle, CFG.vaVoirAnimateur.texte);
}

function demarrerCelebration() {
  const dureeTotale = Date.now() - etat.tempsDebutSession;
  tracker({ type: "session_complete", dureeMs: dureeTotale, etapesReussies: etat.visited.length });
  CrokiStorage.resetProgress();
  document.getElementById("final-animateur-phase").style.display = "none";
  const cel = document.getElementById("final-celebration-phase");
  cel.style.display = "block";
  CrokiScene.setFinal();

  const score = etat.visited.length;
  document.getElementById("txt-final-titre").textContent = "🏆 " + CFG.final.titre;
  document.getElementById("txt-final-score").textContent = CFG.final.bulle;

  const wrap = document.getElementById("wrap-ings-fin");
  wrap.innerHTML = "";
  etat.visited.forEach(id => {
    const stage = CFG.stages.find(s => s.id === id);
    if (!stage) return;
    const el = document.createElement("span");
    el.className = "ing-tag";
    el.textContent = stage.accessoireEmoji + " " + stage.accessoire;
    wrap.appendChild(el);
  });

  lancerConfettis(60);
  setTimeout(() => lancerConfettis(40), 500);
  setTimeout(() => { CrokiScene.starburst(); CrokiScene.flashPulse(); }, 250);

  const vid = document.getElementById("video-outro");
  const btnReplay = document.getElementById("btn-replay-outro");
  vid.loop = false;
  vid.currentTime = 0;
  vid.muted = false;
  vid.volume = 1.0;
  btnReplay.style.display = "none";
  vid.play().catch(() => { vid.muted = true; vid.play().catch(() => {}); });
  vid.onended = () => { btnReplay.style.display = "flex"; };

  direTexte("final__felicitations", CFG.final.bulle);
}

/* ---------------------------------------------------------
   SONS + CONFETTIS
--------------------------------------------------------- */
let introSoundJoue = false;
function playCinematicIntro() {
  if (introSoundJoue) return;
  introSoundJoue = true;
  try {
    const ac = getAudioCtx();
    const now = ac.currentTime;
    const master = ac.createGain();
    master.gain.setValueAtTime(0, now);
    master.gain.linearRampToValueAtTime(.5, now + 1.4);
    master.gain.linearRampToValueAtTime(0, now + 3.4);
    master.connect(ac.destination);
    const notes = [130.81, 164.81, 196.0, 261.63, 329.63];
    notes.forEach((f, i) => {
      [0, 5].forEach(detune => {
        const o = ac.createOscillator(), g = ac.createGain();
        o.type = i < 2 ? "sine" : "triangle";
        o.frequency.value = f; o.detune.value = detune - 2.5;
        g.gain.value = .16;
        o.connect(g); g.connect(master);
        o.start(now); o.stop(now + 3.5);
      });
    });
    const noiseBuf = ac.createBuffer(1, ac.sampleRate * 1.2, ac.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (i / data.length);
    const noise = ac.createBufferSource();
    noise.buffer = noiseBuf;
    const filter = ac.createBiquadFilter();
    filter.type = "bandpass"; filter.frequency.setValueAtTime(400, now); filter.frequency.linearRampToValueAtTime(2200, now + 1.1);
    const noiseGain = ac.createGain();
    noiseGain.gain.setValueAtTime(0, now); noiseGain.gain.linearRampToValueAtTime(.22, now + .9); noiseGain.gain.linearRampToValueAtTime(0, now + 1.3);
    noise.connect(filter); filter.connect(noiseGain); noiseGain.connect(ac.destination);
    noise.start(now); noise.stop(now + 1.3);
  } catch (e) {}
}
setTimeout(playCinematicIntro, 250);
document.addEventListener("pointerdown", playCinematicIntro, { once: true });

let audioCtx = null;
function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

const sonVictoire = new Audio("assets/audio/victoire.mp3");
const sonFaux = new Audio("assets/audio/faux.mp3");
sonVictoire.preload = "auto";
sonFaux.preload = "auto";

function playSuccess() {
  try { sonVictoire.currentTime = 0; sonVictoire.play().catch(() => playSuccessSynth()); }
  catch (e) { playSuccessSynth(); }
}
function playError() {
  try { sonFaux.currentTime = 0; sonFaux.play().catch(() => playErrorSynth()); }
  catch (e) { playErrorSynth(); }
}
function playSuccessSynth() {
  try {
    const ac = getAudioCtx();
    [[523.25,0],[659.25,.12],[783.99,.24],[1046.5,.38]].forEach(([f,t]) => {
      const o = ac.createOscillator(), g = ac.createGain();
      o.connect(g); g.connect(ac.destination);
      o.type = "triangle"; o.frequency.value = f;
      const T = ac.currentTime + t;
      g.gain.setValueAtTime(0,T); g.gain.linearRampToValueAtTime(.4,T+.05);
      g.gain.exponentialRampToValueAtTime(.001,T+.4);
      o.start(T); o.stop(T+.45);
    });
  } catch (e) {}
}
function playErrorSynth() {
  try {
    const ac = getAudioCtx();
    [[392,0],[349.23,.15]].forEach(([f,t]) => {
      const o = ac.createOscillator(), g = ac.createGain();
      o.connect(g); g.connect(ac.destination);
      o.type = "sawtooth"; o.frequency.value = f;
      const T = ac.currentTime + t;
      g.gain.setValueAtTime(.25,T); g.gain.exponentialRampToValueAtTime(.001,T+.22);
      o.start(T); o.stop(T+.26);
    });
  } catch (e) {}
}

// Bruit de 4x4 qui démarre et accélère, pour la transition entre étapes
function playVroom() {
  try {
    const ac = getAudioCtx();
    const now = ac.currentTime;
    const o = ac.createOscillator(), g = ac.createGain();
    const filter = ac.createBiquadFilter();
    filter.type = "lowpass"; filter.frequency.value = 800;
    o.type = "sawtooth";
    o.frequency.setValueAtTime(60, now);
    o.frequency.linearRampToValueAtTime(90, now + .3);
    o.frequency.linearRampToValueAtTime(140, now + 1.1);
    o.frequency.linearRampToValueAtTime(110, now + 1.6);
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(.3, now + .15);
    g.gain.linearRampToValueAtTime(.22, now + 1.2);
    g.gain.linearRampToValueAtTime(0, now + 1.8);
    o.connect(filter); filter.connect(g); g.connect(ac.destination);
    o.start(now); o.stop(now + 1.85);

    // grondement additionnel façon moteur
    const bufSize = ac.sampleRate * 1.6;
    const buf = ac.createBuffer(1, bufSize, ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) d[i] = (Math.random() * 2 - 1) * .5;
    const src = ac.createBufferSource(); src.buffer = buf;
    const f2 = ac.createBiquadFilter(); f2.type = "lowpass"; f2.frequency.value = 300;
    const g2 = ac.createGain();
    g2.gain.setValueAtTime(0, now); g2.gain.linearRampToValueAtTime(.18, now + .2); g2.gain.linearRampToValueAtTime(0, now + 1.7);
    src.connect(f2); f2.connect(g2); g2.connect(ac.destination);
    src.start(now); src.stop(now + 1.7);
  } catch (e) {}
}

function lancerConfettis(n) {
  const wrap = document.getElementById("confetti-wrap");
  const couleurs = ["#FFD54F","#4CAF50","#FF6B35","#A29BFE","#00CEC9","#FD79A8","#FDCB6E"];
  for (let i = 0; i < n; i++) {
    const d = document.createElement("div");
    d.className = "confetti";
    d.style.cssText = `left:${Math.random()*100}vw;background:${couleurs[Math.floor(Math.random()*couleurs.length)]};width:${6+Math.random()*8}px;height:${6+Math.random()*8}px;border-radius:${Math.random()>.5?"50%":"2px"};animation-duration:${1.2+Math.random()*1.4}s;animation-delay:${Math.random()*0.4}s;`;
    wrap.appendChild(d);
    setTimeout(() => d.remove(), 3000);
  }
}

/* ---------------------------------------------------------
   CODE D'ACCÈS AUX RÉGLAGES (PIN)
--------------------------------------------------------- */
function wirePinScreen() {
  const pave = document.getElementById("pin-pave");
  ["1","2","3","4","5","6","7","8","9","","0","⌫"].forEach(t => {
    const b = document.createElement("button");
    b.className = "pin-touche"; b.type = "button"; b.textContent = t;
    if (!t) { b.style.visibility = "hidden"; }
    else b.addEventListener("click", () => CrokiAdmin.pinSaisie(t));
    pave.appendChild(b);
  });
  document.getElementById("btn-pin-annuler").addEventListener("click", () => showScreen("screen-histoire"));
}
