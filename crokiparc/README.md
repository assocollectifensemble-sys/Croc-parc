# 🐊 Croc Parc — la visite guidée de Croki

Application web (PWA) pour les enfants du **Croc Parc**, Étang-Salé, La Réunion.
La mascotte Croki fait découvrir 7 animaux du parc, pose une question à chaque
panneau, fait gagner un accessoire de fête et une lettre du mot **PARADIS**,
puis une charade finale fait deviner ce mot avant d'aller voir l'animateur du
jour pour recevoir une surprise.

**100 % statique** : pas de backend, pas de framework, pas d'étape de build,
aucune dépendance. Le dossier se déploie tel quel sur Netlify.

## Tester en local

```bash
cd crokiparc
python3 -m http.server 8000
# puis ouvrir http://localhost:8000
```

## Les fichiers

| Fichier | Rôle |
|---|---|
| `index.html` | Toute la structure des écrans (une `<section>` par écran) |
| `js/config.js` | **Toutes les données éditoriales** : textes, questions, réponses, mot cible, code PIN, adresse des statistiques. C'est le fichier à modifier pour changer le contenu. |
| `js/app.js` | Logique du jeu |
| `js/storage.js` | `localStorage` : progression, réglages, statistiques |
| `js/db.js` | `IndexedDB` : les voix enregistrées |
| `js/scene.js` | Décor animé (fonds, confettis, transitions) |
| `js/admin.js` | Panneau ⚙️ Réglages, protégé par code PIN |
| `sw.js` | Service Worker — **incrémenter `CACHE_VERSION` à chaque modification** |
| `docs/STATISTIQUES.md` | Où lire les statistiques et comment elles remontent |
| `docs/statistiques-apps-script.gs` | Récepteur Google Apps Script (alternative gratuite et illimitée à Make) |

## Les règles à ne pas casser

1. **Jamais de voix robot.** Tous les textes parlés passent par
   `direTexte(cle, texteSecours)`, qui lit un enregistrement rangé dans
   IndexedDB. Sans enregistrement → silence. Ne jamais réintroduire
   `speechSynthesis`.
2. **Le code PIN est unique et gravé** dans `config.js` (`adminPin`), identique
   pour tout le monde. Pas de code recréable par device.
3. **`CACHE_VERSION` dans `sw.js` doit être incrémenté à chaque modification**
   de n'importe quel fichier, sinon les téléphones restent bloqués sur
   l'ancienne version en cache.
4. **Le mot cible (PARADIS) et l'ordre des 7 étapes sont figés.**
5. **Aucune dépendance externe, aucun framework, aucune étape de build.**
6. Les boutons d'action collants utilisent `.btn-sticky-cta` en
   `position:fixed` — surtout pas `sticky` : le `backdrop-filter` des `.card`
   casse le positionnement sticky (bug déjà rencontré et corrigé).

## Statistiques

Les statistiques de tous les visiteurs remontent dans un Google Sheet.
Tout est expliqué dans **[`docs/STATISTIQUES.md`](docs/STATISTIQUES.md)**.

## Déploiement

Manuel, sur Netlify : glisser le dossier `crokiparc/`. Pas de CI/CD.
Penser à incrémenter `CACHE_VERSION` avant chaque mise en ligne.

## Contact

`asso.collectif.ensemble@gmail.com`
