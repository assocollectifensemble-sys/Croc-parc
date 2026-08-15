/* ============================================================
   DB.JS — Stockage des fichiers audio (voix de Croki) en local
   ============================================================
   Les fichiers audio peuvent être lourds : on les range dans
   IndexedDB (plutôt que localStorage) sous forme de Blob.
   Chaque étape a une "clé audio" (ex: "ferme", "intro", "final").
   ============================================================ */

const CrokiDB = (() => {
  const DB_NAME = "crokiparc-db";
  const STORE = "audio";
  let dbPromise = null;

  function open() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        req.result.createObjectStore(STORE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbPromise;
  }

  async function saveAudio(key, blob) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(blob, key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  }

  async function getAudio(key) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async function deleteAudio(key) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  }

  async function hasAudio(key) {
    const blob = await getAudio(key);
    return !!blob;
  }

  return { saveAudio, getAudio, deleteAudio, hasAudio };
})();
