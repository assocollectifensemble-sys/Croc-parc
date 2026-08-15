/**
 * Service worker minimal.
 *
 * Il met en cache la coquille de l'application (pages, style, scripts) pour que
 * le site s'ouvre meme avec une connexion capricieuse. Il ne met JAMAIS en
 * cache les reponses de l'API : une galerie ne doit pas rester lisible sur un
 * telephone apres son expiration.
 */

const CACHE = "crocparc-photos-v1";
const COQUILLE = [
  "/",
  "/index.html",
  "/gallery.html",
  "/merci.html",
  "/config.js",
  "/css/style.css",
  "/js/app.js",
  "/js/index.js",
  "/js/gallery.js",
  "/js/merci.js",
  "/manifest.json",
  "/icons/icone.svg",
];

self.addEventListener("install", (evenement) => {
  evenement.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(COQUILLE)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (evenement) => {
  evenement.waitUntil(
    caches
      .keys()
      .then((noms) => Promise.all(noms.filter((nom) => nom !== CACHE).map((nom) => caches.delete(nom))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (evenement) => {
  const requete = evenement.request;
  if (requete.method !== "GET") return;

  const url = new URL(requete.url);
  // Ni l'API, ni les images des galeries ne passent par le cache.
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  evenement.respondWith(
    caches.match(requete).then((enCache) => {
      const reseau = fetch(requete)
        .then((reponse) => {
          if (reponse.ok && COQUILLE.includes(url.pathname)) {
            const copie = reponse.clone();
            caches.open(CACHE).then((cache) => cache.put(requete, copie));
          }
          return reponse;
        })
        .catch(() => enCache);
      // Le cache repond tout de suite, le reseau rafraichit derriere.
      return enCache || reseau;
    }),
  );
});
