# Le Maï-Taï by Croc Parc — site vitrine

Site vitrine du restaurant **Le Maï-Taï**, situé à l'intérieur du parc animalier
Croc Parc, en forêt domaniale de l'Étang-Salé (La Réunion).

Objectif du site : devenir la référence centrale de l'établissement à la place des
fiches tierces dispersées, et générer **des appels téléphoniques** — la réservation ne
se fait pas en ligne aujourd'hui.

---

## Sommaire

- [Ce que c'est techniquement](#ce-que-cest-techniquement)
- [Structure du projet](#structure-du-projet)
- [Lancer le site en local](#lancer-le-site-en-local)
- [Déployer sur GitHub Pages](#déployer-sur-github-pages)
- [Brancher le nom de domaine](#brancher-le-nom-de-domaine)
- [Remplacer les images](#remplacer-les-images)
- [Modifier les informations pratiques](#modifier-les-informations-pratiques)
- [Points d'extension prévus](#points-dextension-prévus)
- [Choix techniques et pourquoi](#choix-techniques-et-pourquoi)

---

## Ce que c'est techniquement

Un site **statique** : trois fichiers (HTML, CSS, JS), zéro dépendance, zéro build,
zéro framework. On ouvre `index.html` dans un navigateur, ça marche.

Ce choix est délibéré :

- **Rien à maintenir.** Pas de `npm install` qui casse dans dix-huit mois, pas de
  version de Node à suivre, pas de faille de dépendance à patcher.
- **Hébergeable partout.** GitHub Pages, Netlify, OVH, un simple FTP — c'est du HTML.
- **Rapide sur mobile en 4G réunionnaise.** Pas de bundle JavaScript à télécharger et
  à exécuter avant de voir la page.
- **N'importe qui peut modifier un horaire** sans savoir programmer.

Aucun cookie, aucun traceur, aucune donnée envoyée à un tiers (voir
[Choix techniques](#choix-techniques-et-pourquoi) pour les deux exceptions et comment
les retirer).

---

## Structure du projet

```
maitai/
├── index.html              ← la page. Tout le contenu texte est ici.
├── favicon.svg             ← icône d'onglet (provisoire)
├── robots.txt              ← indexation moteurs de recherche
├── sitemap.xml             ← plan du site pour Google
├── .nojekyll               ← empêche GitHub de retraiter les fichiers
│
├── css/
│   ├── tokens.css          ← ⭐ TOUTES les couleurs, polices, espacements
│   └── style.css           ← mise en page et composants
│
├── js/
│   └── main.js             ← animations, menu mobile, horaires d'ouverture
│
├── images/
│   ├── hero/               ← grandes images d'en-tête
│   ├── galerie/            ← galerie photo
│   ├── plats/              ← photos de plats
│   ├── famille/            ← enfants, jeux, animations
│   ├── nature/             ← forêt, animaux, ambiance
│   └── logo/               ← logo (provisoire)
│
├── assets/
│   └── menu/               ← emplacement du futur PDF de la carte
│
└── docs/
    ├── SEO.md                    ← stratégie de mots-clés et justifications
    ├── CREDITS.md                ← ⭐ statut de chaque image + où trouver les vraies
    ├── SOURCES.md                ← ⭐ d'où vient chaque information affichée
    └── telecharger-images.sh     ← récupère les photos réelles en une commande
```

Les deux fichiers marqués ⭐ sont ceux à consulter en priorité avant toute
modification.

---

## Lancer le site en local

Le plus simple :

```bash
open maitai/index.html      # macOS
xdg-open maitai/index.html  # Linux
```

Avec un vrai serveur local (recommandé, pour que les chemins se comportent comme en
production) :

```bash
cd maitai
python3 -m http.server 8000
# puis http://localhost:8000
```

---

## Déployer sur GitHub Pages

Un workflow GitHub Actions est déjà fourni :
`.github/workflows/deploy-maitai.yml`. Il publie **uniquement le dossier `maitai/`** —
le reste du dépôt n'est jamais exposé.

### ⚠️ Une action manuelle est requise, une seule fois

1. Dépôt GitHub → **Settings** → **Pages**
2. **Build and deployment** → **Source** → choisir **GitHub Actions**
3. Onglet **Actions** → *Déployer le site Maï-Taï sur GitHub Pages* → **Run workflow**

Cette étape ne peut pas être automatisée : le workflow tente bien d'activer Pages
lui-même, mais GitHub refuse qu'un `GITHUB_TOKEN` de workflow **crée** un site Pages
(*« Create Pages site failed. Error: Resource not accessible by integration »*). Il faut
des droits d'administration sur le dépôt.

Une fois cette case cochée, plus rien à faire : chaque `push` touchant à `maitai/`
redéploie automatiquement, et l'URL du site s'affiche à la fin du job dans l'onglet
Actions.

### La branche de déploiement

Ce dépôt **n'a pas de branche `main`** : sa branche par défaut est
`claude/skill-installation-1agmce`, nom hérité d'une session de travail précédente. Le
workflow écoute les deux noms, donc tout fonctionne en l'état — mais renommer la
branche par défaut en `main` (Settings → Branches) serait plus sain, et la ligne
correspondante du workflow pourra alors disparaître.

### Alternative : Netlify / autre hébergeur

Rien à adapter. Il suffit d'indiquer :

- **dossier à publier** : `maitai`
- **commande de build** : aucune

---

## Brancher le nom de domaine

Le jour où le domaine est acheté (par exemple `maitai-crocparc.re`) :

1. **Chez le registrar**, créer un enregistrement `CNAME` pointant vers
   `assocollectifensemble-sys.github.io` (ou les 4 enregistrements `A` de GitHub Pages
   pour un domaine racine — [documentation GitHub](https://docs.github.com/pages/configuring-a-custom-domain-for-your-github-pages-site)).
2. **Créer le fichier `maitai/CNAME`** contenant uniquement le domaine :
   ```
   maitai-crocparc.re
   ```
3. **Mettre à jour trois endroits** où l'URL est écrite en dur :
   - `maitai/robots.txt` → ligne `Sitemap:`
   - `maitai/sitemap.xml` → balise `<loc>`
   - `maitai/index.html` → balise `<link rel="canonical">`, les balises
     `og:url` / `og:image`, et le champ `url` du bloc JSON-LD

Une recherche de `github.io` dans le dossier `maitai/` les trouve tous.

---

## Remplacer les images

**Aucune photo réelle n'est en ligne pour l'instant.** Les douze visuels du site sont
des SVG d'attente, reconnaissables à leur nom (`PLACEHOLDER-…`) et à la mention
« VISUEL D'ATTENTE — À REMPLACER » affichée dessus.

Pourquoi : l'environnement de production de ce site n'avait pas accès aux domaines
hébergeant les photos (politique réseau). Les pages ont pu être lues, les fichiers non.
Tout est expliqué et tracé dans [`docs/CREDITS.md`](docs/CREDITS.md), qui liste **les
URL des vraies photos** déjà identifiées.

### Récupérer les photos existantes

```bash
bash maitai/docs/telecharger-images.sh
```

À lancer depuis votre machine. Les photos publiées par le restaurant sur Tripadvisor et
celles de `croc-parc.re` atterrissent dans `maitai/images/_a-trier/`.

### La méthode de remplacement

Chaque image n'apparaît **qu'une seule fois** dans `index.html`. Pour chaque photo :

1. Déposer le fichier dans le bon sous-dossier de `images/`
2. Rechercher le nom du `PLACEHOLDER-…svg` dans `index.html` (une seule occurrence) et
   le remplacer par le nouveau nom
3. Adapter l'attribut `alt` si le sujet change
4. Supprimer le SVG d'attente

Le tableau des emplacements et des formats attendus est dans
[`docs/CREDITS.md`](docs/CREDITS.md) § 1.

### Recommandations

Pour compresser sans perte visible : [squoosh.app](https://squoosh.app) (gratuit, dans
le navigateur, rien à installer). Une photo sortie du téléphone pèse 4 Mo et fait
s'effondrer le temps de chargement en 4G : viser moins de 350 Ko pour l'image
d'accueil, moins de 200 Ko pour les autres.

⚠️ **Penser au texte alternatif.** Chaque `<img>` a un attribut `alt` qui décrit
l'image. Il sert aux personnes malvoyantes **et** au référencement. Si la photo change
de sujet, mettre à jour le `alt`.

⚠️ **Penser aussi à `og:image`**, en haut de `index.html` : c'est la vignette affichée
quand le lien est partagé sur WhatsApp ou Facebook. Elle pointe aujourd'hui vers le
visuel d'attente.

### Le logo

Le logo actuel (`images/logo/logo-maitai-provisoire.svg`) et le favicon
(`favicon.svg`) sont des placeholders dessinés pour le projet. Les remplacer par les
fichiers officiels dès qu'ils sont disponibles.

---

## Modifier les informations pratiques

### Le numéro de téléphone

Il apparaît à plusieurs endroits (en-tête, hero, barre mobile, accès, appel final,
pied de page, JSON-LD). Pour le changer, rechercher-remplacer dans `index.html` :

- `0692394200` (format technique des liens `tel:`)
- `0692 39 42 00` (format affiché)
- `+262692394200` (format international du JSON-LD)

### Les horaires

Les horaires sont écrits à **trois** endroits, à garder synchronisés :

1. `index.html` → le texte visible (bandeau infos pratiques, section accès, pied de page)
2. `index.html` → le bloc `openingHoursSpecification` du JSON-LD (ce que lit Google)
3. `js/main.js` → la constante `HORAIRES` en haut du fichier, qui calcule la pastille
   « Service en cours / Fermé »

Dans `js/main.js`, les jours vont de `0` (dimanche) à `6` (samedi), et les heures sont
exprimées en minutes depuis minuit (`11 * 60 + 30` = 11 h 30).

### Les couleurs et les polices

Tout est dans `css/tokens.css`, en haut du fichier, avec un commentaire par bloc.
Changer une valeur là met à jour tout le site. **Ne jamais écrire une couleur
directement dans `style.css`** — c'est ce qui garantit que la charte reste cohérente.

---

## Points d'extension prévus

Le site a été construit pour accueillir deux évolutions déjà anticipées. Elles ne sont
**pas** développées, mais la place est faite et signalée.

### 1. Réservation en ligne

**Ce qui existe déjà :**

- Une entrée `Réserver` dans la navigation (desktop et mobile), avec une pastille
  « Bientôt »
- Une section `#reserver` complète, dont le contenu actuel est le bloc téléphone
- Un gestionnaire dans `js/main.js` (bloc n° 7, `[data-reservation-bientot]`)

**Où intervenir :** dans `index.html`, section `<section id="reserver">`. Le bloc
téléphone occupe aujourd'hui toute la largeur. Pour ajouter un module (widget
TheFork / Zenchef / formulaire maison), l'insérer **à côté** du bloc téléphone, pas à
la place : garder l'appel visible reste pertinent même avec une réservation en ligne,
beaucoup de familles réservent encore par téléphone.

Retirer alors : la classe `nav__lien--bientot`, la `<span class="puce-bientot">`, et
l'attribut `data-reservation-bientot`.

### 2. Carte au format PDF

**Ce qui existe déjà :**

- Un bouton « Télécharger notre carte » dans la section `#carte`, désactivé
  (`aria-disabled="true"`), avec la mention explicite qu'il arrive
- Le dossier `assets/menu/` qui l'attend

**Où intervenir :**

1. Déposer le fichier dans `assets/menu/carte-maitai.pdf`
2. Dans `index.html`, sur le bouton `data-bouton-carte-pdf` :
   - remplacer `href="#"` par `href="assets/menu/carte-maitai.pdf"`
   - supprimer `aria-disabled="true"`
   - ajouter `download`
   - supprimer la mention « Bientôt disponible » juste en dessous

### 3. Brancher la mesure d'audience

`js/main.js` (bloc n° 8) envoie déjà un événement `appel_telephone` à chaque clic sur
un lien `tel:`, avec l'origine du clic (`hero`, `barre-mobile`, `pied`…). Il suffit
d'ajouter le script de Google Analytics, Plausible ou Matomo dans le `<head>` : le code
détecte automatiquement lequel est présent, aucune modification de `main.js` n'est
nécessaire.

⚠️ Ajouter Google Analytics implique un bandeau cookies (RGPD). Plausible et Matomo en
mode sans cookie n'en nécessitent pas — c'est la recommandation pour ce site.

---

## Choix techniques et pourquoi

**Mobile-first strict.** L'essentiel du trafic viendra de recherches en mobilité
(« restaurant famille Étang-Salé » depuis une voiture). Le CSS est écrit pour le petit
écran d'abord ; les media queries n'élargissent que ce qui doit l'être. La barre
d'appel collée en bas de l'écran n'existe que sur mobile — sur desktop, le bouton
d'appel de l'en-tête suffit.

**Animations en CSS, pas en JavaScript.** Toutes les animations (feuillage qui oscille,
respiration du hero, apparitions au défilement) sont des transitions CSS déclenchées
par un `IntersectionObserver`. Le JavaScript ne fait qu'ajouter une classe. Résultat :
l'animation tourne sur le compositeur du navigateur, sans bloquer le fil principal, et
le site reste fluide même sur un téléphone d'entrée de gamme.

**`prefers-reduced-motion` respecté.** Les personnes ayant activé la réduction des
animations dans leur système voient un site entièrement statique. Ce n'est pas
optionnel : les animations de parallaxe déclenchent des vertiges chez certaines
personnes.

**Chargement des images différé.** Toutes les images sauf celle du hero portent
`loading="lazy"` et `decoding="async"`. Les dimensions sont déclarées (`width` /
`height`) pour éviter que la page ne « saute » pendant le chargement.

**Polices auto-hébergées.** Fraunces et Outfit sont servies depuis `css/fonts/`, pas
depuis le CDN de Google. Trois bénéfices : une requête externe de moins au premier
rendu, aucune donnée visiteur transmise à Google (donc rien à déclarer côté RGPD), et
un site qui s'affiche correctement même si le CDN est inaccessible. Les fichiers sont
sous licence SIL Open Font License 1.1, qui autorise explicitement cet hébergement.
Fraunces est une police *variable* : ses axes `SOFT` et `WONK` (arrondi et fantaisie
des lettres) sont ce qui donne aux titres leur caractère un peu organique, plutôt que
le serif de luxe qu'on voit partout.

**Un seul appel externe :** la carte OpenStreetMap de la section accès, en `iframe`
avec `loading="lazy"` — elle ne se charge que si le visiteur descend jusque-là.
OpenStreetMap a été préféré à Google Maps parce qu'il ne dépose pas de cookie et ne
nécessite pas de clé d'API. Pour passer à Google Maps, remplacer l'`iframe` de la
section `#acces`.

**Aucune donnée personnelle collectée.** Pas de formulaire, pas de cookie, pas de
traceur. C'est aussi ce qui permet de se passer de bandeau de consentement.

---

## Contrôle qualité

Le site a été vérifié sur rendu réel (Chromium, captures desktop 1440×900,
tablette 820×1180 et mobile 390×844) et non sur relecture de code :

- aucun débordement horizontal sur les trois formats
- aucune image cassée, tous les `alt` renseignés
- un seul `<h1>`, aucun titre vide
- toutes les cibles tactiles ≥ 40 px de haut
- aucune erreur JavaScript, aucune requête en échec
- HTML valide (`npx html-validate maitai/index.html`, configuration à la racine)

Pour rejouer la validation HTML :

```bash
npx html-validate maitai/index.html
```

---

## Ce qui reste à valider

Voir [`docs/SOURCES.md`](docs/SOURCES.md) : ce fichier liste, information par
information, la source qui la confirme — et surtout **celles qui n'ont pas pu être
vérifiées**.

Trois points méritent votre attention immédiate :

1. **L'entrée du parc est-elle offerte aux clients du restaurant ?** Un avis client
   l'affirme, aucune source officielle ne le confirme. Si c'est vrai, c'est l'argument
   le plus fort du site et il n'y figure pas.
2. **Y a-t-il une formule du midi ?** Les prix relevés (21–32 €) sont ceux d'une carte
   de restaurant, pas d'un déjeuner rapide.
3. **La fiche Tripadvisor géolocalise le restaurant près de Saint-Leu**, à une dizaine
   de kilomètres de la réalité. À corriger chez eux.
