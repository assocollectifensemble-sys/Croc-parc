/* ============================================================
   SW.JS — Cache l'appli entière pour un fonctionnement hors-ligne
   ============================================================
   Stratégie : "cache d'abord, réseau en secours" pour tout SAUF
   les vidéos (les lecteurs vidéo font des requêtes par plages
   d'octets - "Range requests" - qui se marient mal avec le cache
   des Service Workers). Les vidéos passent donc directement par
   le réseau et profitent du cache HTTP natif du navigateur.

   -> Change CACHE_VERSION à chaque modification des fichiers pour
      forcer les téléphones à retélécharger la nouvelle version.
   ============================================================ */

const CACHE_VERSION = "crokiparc-v20";

const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/style.css",
  "./js/config.js",
  "./js/db.js",
  "./js/storage.js",
  "./js/scene.js",
  "./js/app.js",
  "./js/admin.js",
  "./assets/img/plan-parc.webp",
  "./assets/img/croki-accueil-salut.webp",
  "./assets/img/croki-splash.webp",
  "./assets/img/croki-reflechit-pilier.webp",
  "./assets/img/croki-appuye-malin.webp",
  "./assets/img/croki-salut-4pattes.webp",
  "./assets/img/croki-court.webp",
  "./assets/img/croki-safari.webp",
  "./assets/img/croki-victoire-peace.webp",
  "./assets/img/croki-hesite.webp",
  "./assets/img/croki-duo-pense.webp",
  "./assets/img/croki-a-toi-de-jouer.webp",
  "./assets/img/croki-espoir-nuage.webp",
  "./assets/img/croki-victoire-medaille.webp",
  "./assets/audio/victoire.mp3",
  "./assets/audio/faux.mp3",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./assets/icons/apple-touch-icon.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  // Vidéos : on laisse le navigateur gérer nativement (Range requests)
  if (event.request.url.includes("/assets/video/")) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request)
        .then(res => {
          const resClone = res.clone();
          caches.open(CACHE_VERSION).then(cache => cache.put(event.request, resClone));
          return res;
        })
        .catch(() => cached);
    })
  );
});
