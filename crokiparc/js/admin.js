/* ============================================================
   ADMIN.JS — Écran Réglages : code d'accès, géoloc, voix, bilan
   ============================================================ */

const CrokiAdmin = (() => {
  let recorder = null;
  let recordedChunks = [];
  let pinBuffer = "";
  let pinMode = "verify"; // "verify" | "creer" | "confirmer"
  let pinPremierEssai = "";

  function init() {
    document.getElementById("btn-fermer-admin").addEventListener("click", close);
    document.getElementById("btn-export-config").addEventListener("click", exportConfig);
    document.getElementById("btn-reset-tout").addEventListener("click", resetTout);
    document.getElementById("inp-import-config").addEventListener("change", importConfig);
    document.getElementById("btn-changer-pin").addEventListener("click", () => {
      if (CrokiStorage.codeEstGrave()) {
        alert("Ce code est gravé dans l'application pour tout le monde. Pour le changer, demande une nouvelle version à ton développeur — le changer ici ne le modifierait que sur ce téléphone, pas pour les autres visiteurs.");
        return;
      }
      CrokiStorage.clearAdminPin();
      demanderAcces();
    });
    document.getElementById("btn-reset-stats").addEventListener("click", () => {
      if (confirm("Effacer toutes les statistiques enregistrées sur ce téléphone ?")) {
        CrokiStorage.resetStats();
        renderBilan();
      }
    });
    document.getElementById("btn-save-webhook").addEventListener("click", () => {
      CrokiStorage.setWebhookUrl(document.getElementById("inp-webhook").value.trim());
      document.getElementById("webhook-status").textContent = "✅ Adresse enregistrée !";
    });
    document.getElementById("inp-webhook").value = CrokiStorage.getWebhookUrl();
    render();
  }

  /* ---------------- Code d'accès (PIN) ---------------- */
  function demanderAcces() {
    const pin = CrokiStorage.getAdminPin();
    pinBuffer = "";
    if (!pin) {
      // Aucun code gravé dans config.js (mode test local uniquement) : on en crée un temporaire.
      pinMode = "creer";
      document.getElementById("pin-titre").textContent = "🔒 Crée ton code secret";
      document.getElementById("pin-soustitre").textContent = "Choisis un code à 4 chiffres pour protéger les réglages.";
      document.getElementById("pin-oublie").style.display = "none";
    } else {
      pinMode = "verify";
      document.getElementById("pin-titre").textContent = "🔒 Code secret";
      document.getElementById("pin-soustitre").textContent = "Entre le code à 4 chiffres pour accéder aux réglages.";
      // Le code est gravé dans le code de l'appli : un seul code pour tout le monde,
      // pas de "code oublié" en libre-service (ça éviterait qu'un autre visiteur en crée un autre).
      document.getElementById("pin-oublie").style.display = CrokiStorage.codeEstGrave() ? "none" : "block";
    }
    document.getElementById("pin-erreur").textContent = "";
    majPinDots();
    showScreen("screen-pin");
  }

  function majPinDots() {
    document.querySelectorAll(".pin-dot").forEach((d, i) => d.classList.toggle("rempli", i < pinBuffer.length));
  }

  function pinSaisie(touche) {
    const erreurEl = document.getElementById("pin-erreur");
    if (touche === "⌫") { pinBuffer = pinBuffer.slice(0, -1); majPinDots(); return; }
    if (pinBuffer.length >= 4) return;
    pinBuffer += touche;
    majPinDots();
    if (pinBuffer.length < 4) return;

    if (pinMode === "creer") {
      pinPremierEssai = pinBuffer;
      pinBuffer = "";
      pinMode = "confirmer";
      document.getElementById("pin-soustitre").textContent = "Retape le même code pour confirmer.";
      majPinDots();
    } else if (pinMode === "confirmer") {
      if (pinBuffer === pinPremierEssai) {
        CrokiStorage.setAdminPin(pinBuffer);
        open();
      } else {
        erreurEl.textContent = "Les deux codes ne correspondent pas, recommence.";
        pinBuffer = ""; pinPremierEssai = ""; pinMode = "creer";
        document.getElementById("pin-soustitre").textContent = "Choisis un code à 4 chiffres pour protéger les réglages.";
        majPinDots();
      }
    } else {
      if (pinBuffer === CrokiStorage.getAdminPin()) {
        open();
      } else {
        erreurEl.textContent = "Code incorrect, réessaie.";
        pinBuffer = "";
        majPinDots();
      }
    }
  }

  function open() {
    render();
    renderBilan();
    renderVoiceBank();
    showScreen("screen-admin");
  }

  function close() {
    CFG = CrokiStorage.getConfig();
    showScreen("screen-histoire");
  }

  /* ---------------- 📊 Bilan ---------------- */
  function renderBilan() {
    const stats = CrokiStorage.getStats();
    const sessions = stats.filter(e => e.type === "session_start" || e.type === "session_reprise");
    const completes = stats.filter(e => e.type === "session_complete");
    const reponses = stats.filter(e => e.type === "reponse");
    const bonnesReponses = reponses.filter(e => e.correct);

    const dureeMoy = completes.length
      ? Math.round(completes.reduce((s, e) => s + e.dureeMs, 0) / completes.length / 1000 / 60 * 10) / 10
      : null;

    const resume = document.getElementById("bilan-resume");
    resume.innerHTML = `
      <div class="bilan-stat-row"><span>Parties commencées</span><b>${sessions.length}</b></div>
      <div class="bilan-stat-row"><span>Parties terminées</span><b>${completes.length}</b></div>
      <div class="bilan-stat-row"><span>Taux de réussite du 1er coup</span><b>${reponses.length ? Math.round(bonnesReponses.length / reponses.length * 100) : 0}%</b></div>
      <div class="bilan-stat-row"><span>Durée moyenne d'une partie</span><b>${dureeMoy != null ? dureeMoy + " min" : "—"}</b></div>
    `;

    const parEtape = {};
    reponses.forEach(r => {
      if (!parEtape[r.stageId]) parEtape[r.stageId] = { total: 0, ratees: 0 };
      parEtape[r.stageId].total++;
      if (!r.correct) parEtape[r.stageId].ratees++;
    });
    const zone = document.getElementById("bilan-questions");
    zone.innerHTML = "";
    const cfg = CrokiStorage.getConfig();
    cfg.stages.forEach(s => {
      const d = parEtape[s.id];
      if (!d) return;
      const el = document.createElement("div");
      el.className = "bilan-question-item";
      el.innerHTML = `<div class="bq-nom">${s.emoji} ${s.nom}</div>${d.total} réponses données · ${d.ratees} erreur(s) avant de trouver`;
      zone.appendChild(el);
    });
  }

  /* ---------------- 🎙️ Banque de voix (générique) ---------------- */
  function getVoiceBankItems() {
    const cfg = CrokiStorage.getConfig();
    const items = [];
    items.push({ key: cfg.histoireAccueil.cle, label: "Page d'accueil (bienvenue + mission)", texte: cfg.histoireAccueil.texte });
    items.push({ key: cfg.histoireVideo.cle, label: "Vidéo « C'est parti ! »", texte: cfg.histoireVideo.texte });
    items.push({ key: cfg.carteExplication.cle, label: "Explication de la carte (numéros 1 à 7)", texte: cfg.carteExplication.texte });
    cfg.stages.forEach(s => {
      items.push({ key: s.id + "__transition", label: "Transition vers : " + s.nom, texte: s.transition });
      items.push({ key: s.id + "__question", label: "Question : " + s.nom, texte: s.intro + " " + s.question.texte });
      items.push({ key: s.id + "__resultat", label: "Explication : " + s.nom, texte: s.question.explication });
    });
    items.push({ key: cfg.enigmeFinale.cle, label: "Énigme finale (avant le mini-jeu)", texte: cfg.enigmeFinale.texte });
    items.push({ key: cfg.vaVoirAnimateur.cle, label: "Va voir l'animateur (mot trouvé)", texte: cfg.vaVoirAnimateur.texte });
    items.push({ key: "final__felicitations", label: "Félicitations finales", texte: cfg.final.bulle });
    return items;
  }

  function renderVoiceBank() {
    const wrap = document.getElementById("wrap-voice-bank");
    wrap.innerHTML = "";
    getVoiceBankItems().forEach(item => wrap.appendChild(buildVoiceItem(item)));
  }

  function buildVoiceItem(item) {
    const div = document.createElement("div");
    div.className = "voice-item";
    div.innerHTML = `
      <div class="voice-item-label">${escapeHTML(item.label)}</div>
      <div class="voice-item-preview">« ${escapeHTML(String(item.texte).slice(0, 90))}${String(item.texte).length > 90 ? "…" : ""} »</div>
      <div class="admin-audio-row">
        <button class="btn btn-vert btn-sm btn-rec" type="button">🎙️ Enregistrer</button>
        <button class="btn btn-rouge btn-sm btn-stop-rec" type="button" style="display:none">⏹️ Stop</button>
        <button class="btn btn-gris btn-sm btn-play-rec" type="button" style="display:none">▶️ Écouter</button>
        <button class="btn btn-gris btn-sm btn-del-rec" type="button" style="display:none">🗑️</button>
        <label class="btn btn-gris btn-sm" style="cursor:pointer">
          📁 Fichier
          <input type="file" class="inp-audio-file" accept="audio/*" style="display:none">
        </label>
      </div>
      <div class="audio-status absent">⚠️ Pas encore enregistré — silence pour l'instant</div>
    `;
    const els = {
      btnRec: div.querySelector(".btn-rec"), btnStop: div.querySelector(".btn-stop-rec"),
      btnPlay: div.querySelector(".btn-play-rec"), btnDel: div.querySelector(".btn-del-rec"),
      inpFile: div.querySelector(".inp-audio-file"), status: div.querySelector(".audio-status")
    };
    els.btnRec.addEventListener("click", () => startRecording(els, item.key));
    els.btnStop.addEventListener("click", () => stopRecording(els));
    els.btnPlay.addEventListener("click", async () => {
      const blob = await CrokiDB.getAudio(item.key);
      if (blob) new Audio(URL.createObjectURL(blob)).play();
    });
    els.btnDel.addEventListener("click", async () => {
      await CrokiDB.deleteAudio(item.key);
      refreshAudioStatus(els, item.key);
    });
    els.inpFile.addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      await CrokiDB.saveAudio(item.key, file);
      refreshAudioStatus(els, item.key);
    });
    refreshAudioStatus(els, item.key);
    return div;
  }

  function render() {
    const cfg = CrokiStorage.getConfig();
    const wrap = document.getElementById("wrap-admin-stages");
    wrap.innerHTML = "";
    cfg.stages.forEach((stage, i) => wrap.appendChild(buildStageCard(stage, i)));
  }

  function buildStageCard(stage, index) {
    const card = document.createElement("div");
    card.className = "card admin-stage-card";
    card.dataset.stageId = stage.id;

    const allImages = CROKI_IMAGES.concat(CROKI_SCENES);
    const imgOptions = allImages.map(name =>
      `<option value="${name}" ${name === stage.crokiImage ? "selected" : ""}>${name}${CROKI_SCENES.includes(name) ? " (scène complète)" : ""}</option>`
    ).join("");

    const optionsHTML = stage.question.options.map((opt, i) => `
      <div class="admin-option-row">
        <input type="radio" class="admin-radio" name="bonne-${stage.id}" data-idx="${i}" ${i === stage.question.bonne ? "checked" : ""}>
        <input type="text" class="inp-option" data-idx="${i}" value="${escapeHTML(opt)}">
      </div>
    `).join("");

    card.innerHTML = `
      <div class="admin-stage-title">${stage.emoji} Étape ${index + 1} — <span class="lbl-nom">${escapeHTML(stage.nom)}</span></div>

      <div class="admin-field">
        <label>Nom de l'étape</label>
        <input type="text" class="inp-nom" value="${escapeHTML(stage.nom)}">
      </div>

      <div class="admin-field">
        <label>Accessoire de fête gagné</label>
        <div class="admin-option-row">
          <input type="text" class="inp-emoji" value="${escapeHTML(stage.accessoireEmoji)}" style="max-width:52px;text-align:center">
          <input type="text" class="inp-accessoire" value="${escapeHTML(stage.accessoire)}">
        </div>
      </div>

      <div class="admin-field">
        <label>Image de Croki pour cette étape</label>
        <select class="inp-image">${imgOptions}</select>
      </div>

      <div class="admin-field">
        <label>Phrase dite en chemin vers cette étape</label>
        <textarea class="inp-transition">${escapeHTML(stage.transition || "")}</textarea>
      </div>

      <div class="admin-field">
        <label>Petite phrase d'intro (dite en arrivant, avant la question)</label>
        <textarea class="inp-intro">${escapeHTML(stage.intro)}</textarea>
      </div>

      <div class="admin-field">
        <label>Question posée devant le panneau</label>
        <textarea class="inp-question">${escapeHTML(stage.question.texte)}</textarea>
      </div>

      <div class="admin-field">
        <label>Réponses (coche la bonne — les enfants pourront retenter jusqu'à la trouver)</label>
        ${optionsHTML}
      </div>

      <div class="admin-field">
        <label>Explication donnée après la bonne réponse</label>
        <textarea class="inp-explication">${escapeHTML(stage.question.explication)}</textarea>
      </div>

      <p style="font-size:12px;color:var(--texte-clair);margin-top:6px">🎙️ Les voix de cette étape (transition, question, explication) s'enregistrent dans la <strong>Banque de voix</strong> plus haut.</p>
    `;

    wireStageCard(card, stage);
    return card;
  }

  function wireStageCard(card, stage) {
    const save = (partial) => {
      CrokiStorage.updateStageOverride(stage.id, partial);
      CFG = CrokiStorage.getConfig();
    };

    card.querySelector(".inp-nom").addEventListener("change", e => {
      save({ nom: e.target.value });
      card.querySelector(".lbl-nom").textContent = e.target.value;
    });
    card.querySelector(".inp-accessoire").addEventListener("change", e => save({ accessoire: e.target.value }));
    card.querySelector(".inp-emoji").addEventListener("change", e => save({ accessoireEmoji: e.target.value }));
    card.querySelector(".inp-image").addEventListener("change", e => {
      const crokiScene = CROKI_SCENES.includes(e.target.value);
      save({ crokiImage: e.target.value, crokiScene });
    });
    card.querySelector(".inp-transition").addEventListener("change", e => save({ transition: e.target.value }));
    card.querySelector(".inp-intro").addEventListener("change", e => save({ intro: e.target.value }));
    card.querySelector(".inp-question").addEventListener("change", e => save({ question: { texte: e.target.value } }));
    card.querySelector(".inp-explication").addEventListener("change", e => save({ question: { explication: e.target.value } }));

    card.querySelectorAll(".inp-option").forEach(inp => {
      inp.addEventListener("change", () => {
        const options = Array.from(card.querySelectorAll(".inp-option")).map(i => i.value);
        save({ question: { options } });
      });
    });
    card.querySelectorAll(".admin-radio").forEach(radio => {
      radio.addEventListener("change", e => save({ question: { bonne: parseInt(e.target.dataset.idx, 10) } }));
    });
  }

  async function startRecording(els, audioKey) {
    if (!navigator.mediaDevices || !window.MediaRecorder) {
      alert("L'enregistrement audio n'est pas disponible sur ce navigateur. Utilise « Fichier » à la place.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm"
        : MediaRecorder.isTypeSupported("audio/mp4") ? "audio/mp4" : "";
      recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      recordedChunks = [];
      recorder.ondataavailable = e => { if (e.data.size > 0) recordedChunks.push(e.data); };
      recorder.onstop = async () => {
        const blob = new Blob(recordedChunks, { type: recorder.mimeType || "audio/webm" });
        await CrokiDB.saveAudio(audioKey, blob);
        stream.getTracks().forEach(t => t.stop());
        refreshAudioStatus(els, audioKey);
      };
      recorder.start();
      els.btnRec.style.display = "none";
      els.btnStop.style.display = "inline-block";
      els.status.innerHTML = '<span class="rec-dot"></span>Enregistrement en cours… parle près du micro !';
      els.status.className = "audio-status";
    } catch (err) {
      alert("Impossible d'accéder au micro. Vérifie les autorisations du navigateur.");
    }
  }

  function stopRecording(els) {
    if (recorder && recorder.state !== "inactive") recorder.stop();
    els.btnStop.style.display = "none";
    els.btnRec.style.display = "inline-block";
  }

  async function refreshAudioStatus(els, audioKey) {
    const has = await CrokiDB.hasAudio(audioKey);
    els.btnPlay.style.display = has ? "inline-block" : "none";
    els.btnDel.style.display = has ? "inline-block" : "none";
    els.status.textContent = has ? "✅ Voix enregistrée." : "⚠️ Pas encore enregistré — silence pour l'instant";
    els.status.className = "audio-status" + (has ? "" : " absent");
  }

  function exportConfig() {
    const blob = new Blob([CrokiStorage.exportConfigJSON()], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "crokiparc-config.json";
    a.click();
  }

  function importConfig(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        CrokiStorage.importConfigJSON(reader.result);
        CFG = CrokiStorage.getConfig();
        render();
        renderVoiceBank();
        alert("Configuration importée avec succès !");
      } catch (err) {
        alert("Ce fichier ne semble pas être une configuration valide.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  function resetTout() {
    if (!confirm("Réinitialiser tous les réglages (positions GPS, questions, voix) ? Cette action est irréversible.")) return;
    CrokiStorage.resetOverrides();
    CFG = CrokiStorage.getConfig();
    render();
    renderVoiceBank();
  }

  function escapeHTML(str) {
    return String(str).replace(/[&<>"']/g, c => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }

  return { init, open, close, demanderAcces, pinSaisie };
})();
