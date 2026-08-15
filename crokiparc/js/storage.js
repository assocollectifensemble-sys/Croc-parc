/* ============================================================
   STORAGE.JS — Overrides de config + progression du joueur
   ============================================================
   Deux choses distinctes sont sauvegardées dans le navigateur :

   1. "crokiparc_overrides" : les modifications faites depuis
      l'écran Réglages (⚙️) — coordonnées GPS, questions, etc.
      Elles sont fusionnées par-dessus DEFAULT_CONFIG (config.js)
      à chaque chargement, sans jamais toucher au code.

   2. "crokiparc_progress" : l'avancée du joueur en cours
      (prénom, étape actuelle, bonnes réponses).
   ============================================================ */

const CrokiStorage = (() => {
  const KEY_OVERRIDES = "crokiparc_overrides";
  const KEY_PROGRESS = "crokiparc_progress";

  // ---------- OVERRIDES (config modifiée sur site) ----------
  function getOverrides() {
    try {
      return JSON.parse(localStorage.getItem(KEY_OVERRIDES)) || {};
    } catch (e) {
      return {};
    }
  }

  function saveOverrides(overrides) {
    localStorage.setItem(KEY_OVERRIDES, JSON.stringify(overrides));
  }

  function resetOverrides() {
    localStorage.removeItem(KEY_OVERRIDES);
  }

  // Fusionne DEFAULT_CONFIG avec les overrides stockés localement.
  // Renvoie une config prête à l'emploi pour toute l'appli.
  function getConfig() {
    const overrides = getOverrides();
    const cfg = JSON.parse(JSON.stringify(DEFAULT_CONFIG)); // clone profond

    if (overrides.stages) {
      cfg.stages = cfg.stages.map(stage => {
        const o = overrides.stages[stage.id];
        if (!o) return stage;
        return {
          ...stage,
          ...o,
          coords: o.coords ? { ...stage.coords, ...o.coords } : stage.coords,
          question: o.question ? { ...stage.question, ...o.question } : stage.question
        };
      });
    }
    if (overrides.accueil) cfg.accueil = { ...cfg.accueil, ...overrides.accueil };
    if (overrides.final) cfg.final = { ...cfg.final, ...overrides.final };
    if (overrides.mapCalibration) cfg.mapCalibration = overrides.mapCalibration;

    return cfg;
  }

  function saveMapCalibration(calib) {
    const overrides = getOverrides();
    overrides.mapCalibration = calib;
    saveOverrides(overrides);
  }

  // Met à jour une étape précise dans les overrides
  function updateStageOverride(stageId, partial) {
    const overrides = getOverrides();
    if (!overrides.stages) overrides.stages = {};
    const existing = overrides.stages[stageId] || {};
    overrides.stages[stageId] = {
      ...existing,
      ...partial,
      coords: partial.coords ? { ...existing.coords, ...partial.coords } : existing.coords,
      question: partial.question ? { ...existing.question, ...partial.question } : existing.question
    };
    saveOverrides(overrides);
  }

  function resetStageOverride(stageId) {
    const overrides = getOverrides();
    if (overrides.stages) delete overrides.stages[stageId];
    saveOverrides(overrides);
  }

  // ---------- PROGRESSION DU JOUEUR ----------
  function getProgress() {
    try {
      return JSON.parse(localStorage.getItem(KEY_PROGRESS)) || null;
    } catch (e) {
      return null;
    }
  }

  function saveProgress(progress) {
    localStorage.setItem(KEY_PROGRESS, JSON.stringify(progress));
  }

  function resetProgress() {
    localStorage.removeItem(KEY_PROGRESS);
  }

  // ---------- EXPORT / IMPORT (sauvegarde du parcours complet) ----------
  function exportConfigJSON() {
    return JSON.stringify(getOverrides(), null, 2);
  }

  function importConfigJSON(jsonText) {
    const data = JSON.parse(jsonText); // lève une erreur si invalide -> à catcher à l'appel
    saveOverrides(data);
  }

  // ---------- CODE D'ACCÈS AUX RÉGLAGES ----------
  // Le code gravé dans DEFAULT_CONFIG.adminPin (config.js) est LE SEUL code
  // valable, identique pour tous les visiteurs du site. Le localStorage ne
  // sert que de repli pour les tests locaux tant qu'aucun code définitif
  // n'a été gravé (adminPin encore à null dans config.js).
  const KEY_PIN = "crokiparc_admin_pin";
  function getAdminPin() { return DEFAULT_CONFIG.adminPin || localStorage.getItem(KEY_PIN); }
  function setAdminPin(pin) { localStorage.setItem(KEY_PIN, pin); }
  function clearAdminPin() { localStorage.removeItem(KEY_PIN); }
  function codeEstGrave() { return !!DEFAULT_CONFIG.adminPin; }

  // ---------- STATISTIQUES (analytics local + envoi vers un webhook commun) ----------
  const KEY_STATS = "crokiparc_stats";
  const KEY_WEBHOOK = "crokiparc_webhook_url";

  function getStats() {
    try { return JSON.parse(localStorage.getItem(KEY_STATS)) || []; }
    catch (e) { return []; }
  }

  // Un événement part-il sur le réseau ? (cf. webhookEvents dans config.js)
  // Liste absente ou vide = on transmet tout.
  function evenementTransmis(type) {
    const liste = DEFAULT_CONFIG.webhookEvents;
    if (!Array.isArray(liste) || liste.length === 0) return true;
    return liste.includes(type);
  }

  function ajouterEvenement(evt) {
    const stats = getStats();
    const complet = { ...evt, ts: Date.now(), date: new Date().toISOString() };
    stats.push(complet);
    // on garde un historique raisonnable (les 1000 derniers événements)
    while (stats.length > 1000) stats.shift();
    localStorage.setItem(KEY_STATS, JSON.stringify(stats));

    const webhook = getWebhookUrl();
    if (!webhook || !evenementTransmis(complet.type)) return;

    // ⚠️ Encodage formulaire (application/x-www-form-urlencoded) et NON JSON.
    // En mode `no-cors` — obligatoire ici, puisqu'aucun récepteur ne renvoie
    // d'en-têtes CORS — le navigateur n'autorise que trois types de contenu :
    // text/plain, multipart/form-data et x-www-form-urlencoded. C'est le seul
    // des trois que Make et Google Apps Script redécoupent de façon fiable en
    // champs nommés ; du JSON en text/plain arrive en un seul bloc informe.
    // La colonne « Détails » conserve malgré tout l'événement JSON complet.
    const form = new URLSearchParams();
    form.set("sessionId", complet.sessionId || "");
    form.set("type", complet.type || "");
    form.set("stageNom", complet.stageNom || "");
    form.set("reponseTexte", complet.reponseTexte || "");
    form.set("correct", complet.correct === true ? "true" : (complet.correct === false ? "false" : ""));
    form.set("tempsMs", complet.tempsMs != null ? String(complet.tempsMs) : "");
    form.set("dureeMs", complet.dureeMs != null ? String(complet.dureeMs) : "");
    form.set("date", complet.date);
    form.set("details", JSON.stringify(complet));

    // sendBeacon survit à la fermeture de l'onglet — typiquement l'enfant qui
    // range le téléphone au milieu du parcours. fetch sert de repli.
    try {
      if (navigator.sendBeacon && navigator.sendBeacon(webhook, form)) return;
    } catch (e) { /* repli sur fetch juste en dessous */ }
    fetch(webhook, { method: "POST", mode: "no-cors", body: form }).catch(() => {});
  }

  function resetStats() { localStorage.removeItem(KEY_STATS); }

  // Le webhook gravé dans DEFAULT_CONFIG.webhookUrl (config.js) est LE SEUL
  // envoyé pour tous les visiteurs. Le localStorage ne sert que de repli
  // pour tester une adresse en local avant de la graver définitivement.
  function getWebhookUrl() { return DEFAULT_CONFIG.webhookUrl || localStorage.getItem(KEY_WEBHOOK) || ""; }
  function setWebhookUrl(url) { localStorage.setItem(KEY_WEBHOOK, url); }

  return {
    getConfig, getOverrides, saveOverrides, resetOverrides,
    updateStageOverride, resetStageOverride, saveMapCalibration,
    getProgress, saveProgress, resetProgress,
    exportConfigJSON, importConfigJSON,
    getAdminPin, setAdminPin, clearAdminPin, codeEstGrave,
    getStats, ajouterEvenement, resetStats, getWebhookUrl, setWebhookUrl
  };
})();
