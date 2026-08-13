# Images — origine, statut, remplacement

## En un mot

**Aucune photo réelle n'est actuellement en ligne sur le site.** Les douze visuels
présents sont des **SVG d'attente** dessinés pour ce projet, dans la palette de la
charte, et portant en toutes lettres la mention « VISUEL D'ATTENTE — À REMPLACER ».

Ce n'est pas un choix esthétique, c'est une contrainte technique documentée plus bas
(§ 3). Les vraies photos ont été **identifiées et tracées** ci-dessous : elles sont
téléchargeables en une commande depuis votre poste (§ 2).

---

## 1. Les emplacements à remplir

| Fichier actuel | Emplacement sur le site | Photo attendue | Format cible |
|---|---|---|---|
| `images/hero/PLACEHOLDER-terrasse-foret.svg` | Image d'accueil, plein écran | Vue large de la varangue ou du jardin, lumière du midi | 2000 × 1300, < 350 Ko |
| `images/hero/PLACEHOLDER-appel-final.svg` | Fond de la section « Réserver » | Sous-bois, peu contrasté (du texte passe dessus) | 2000 × 1200, < 300 Ko |
| `images/famille/PLACEHOLDER-pause-dejeuner.svg` | Carte « pause déjeuner » | Table dressée, cadre calme, format portrait | 1200 × 1500, < 200 Ko |
| `images/famille/PLACEHOLDER-jeux-enfants.svg` | Carte « sortie famille » | Enfants sur l'esplanade, gonflables, mini-golf | 1200 × 1500, < 200 Ko |
| `images/nature/PLACEHOLDER-foret-filaos.svg` | Section « Le lieu », image principale | Allée de filaos, lumière filtrée | 1200 × 1500, < 200 Ko |
| `images/nature/PLACEHOLDER-animal-parc.svg` | Section « Le lieu », vignette ronde | Maki catta, paon bleu, tortue ou crocodile | 700 × 700, < 100 Ko |
| `images/galerie/PLACEHOLDER-01-varangue.svg` | Galerie, grande tuile | La varangue, cadrage large | 1200 × 800, < 180 Ko |
| `images/galerie/PLACEHOLDER-02-plat.svg` | Galerie, tuile haute | Un plat de la carte, format portrait | 800 × 1000, < 150 Ko |
| `images/galerie/PLACEHOLDER-03-jardin.svg` | Galerie | Les tables côté jardin | 800 × 600, < 150 Ko |
| `images/galerie/PLACEHOLDER-04-kiosques.svg` | Galerie | Kiosques ombragés, espace pique-nique | 800 × 600, < 150 Ko |
| `images/galerie/PLACEHOLDER-05-enfants.svg` | Galerie | Gonflables, mini-golf, aire de jeux | 800 × 600, < 150 Ko |
| `images/galerie/PLACEHOLDER-06-animaux.svg` | Galerie | Crocodiles, makis, mini-ferme | 800 × 600, < 150 Ko |

À cela s'ajoutent deux visuels de marque, également provisoires :

| Fichier | Rôle |
|---|---|
| `images/logo/logo-maitai-provisoire.svg` | Logo (en-tête, pied de page) |
| `favicon.svg` | Icône d'onglet du navigateur |

---

## 2. Les vraies photos identifiées

### 2.1 Publiées par le restaurant sur Tripadvisor

La fiche Tripadvisor est **attribuée** (« Une personne de cet établissement gère cette
page »), ces deux photos ont donc été mises en ligne par l'établissement lui-même :
c'est la source la plus sûre côté droits.

| Contenu | URL | Résolution |
|---|---|---|
| Risotto gambas | `https://media-cdn.tripadvisor.com/media/photo-m/1280/32/6a/6b/e0/risotto-gambas.jpg` | 1280 px de large |
| « L'entrée de notre restaurant au cœur de la forêt » | `https://dynamic-media-cdn.tripadvisor.com/media/photo-o/32/6a/7b/c8/l-entree-de-notre-restaurant.jpg` | original |

### 2.2 Publiées sur croc-parc.re (votre propre site)

Aucune question de droits : ce sont vos fichiers.

| Contenu | URL |
|---|---|
| Kiosques ombragés (espace pique-nique) | `https://croc-parc.re/wp-content/uploads/2024/12/kiosques-2-new-768x481.jpg` |
| Visuel de la page restauration | `https://croc-parc.re/wp-content/uploads/2026/07/image1-1.webp` |
| Mini-golf | `https://croc-parc.re/wp-content/uploads/2024/12/mini-golf.jpg` |
| Paon bleu | `https://croc-parc.re/wp-content/uploads/2024/12/paon.jpg` |
| Lémurien (PNG détouré) | `https://croc-parc.re/wp-content/uploads/2024/12/lemurien.png` |
| Visite guidée | `https://croc-parc.re/wp-content/uploads/2024/12/visite-guidee.jpg` |
| Chasse au trésor / animations | `https://croc-parc.re/wp-content/uploads/2024/12/animations-ludiques-chasse-au-tresor.jpg` |
| Logo Croc Parc | `https://croc-parc.re/wp-content/uploads/2024/12/LOGO-CROC-PARC.png` |
| Cartes du Croc'Snack (3 visuels) | `https://croc-parc.re/wp-content/uploads/2026/07/LE-CROCSNACK-CARTE1.jpg` · `…-CARTE-2.jpg` · `…-CARTE-3-1-3.jpg` |

### 2.3 Sources non exploitables depuis ici

| Source | Ce qui s'est passé |
|---|---|
| Page Facebook du restaurant | Refus de l'outil d'extraction : Facebook n'est pas supporté. **C'est pourtant la source la plus riche** (carte de la semaine publiée chaque semaine). À exploiter manuellement. |
| Instagram `@crocparc` | Même limitation. |
| Fiche Google Business | Les photos ne sont pas extractibles par une URL stable. |

---

## 3. Pourquoi les photos ne sont pas déjà intégrées

L'environnement dans lequel ce site a été produit applique une **politique réseau
restrictive** : seuls quelques domaines techniques sont joignables. Toute tentative de
téléchargement vers `croc-parc.re`, `media-cdn.tripadvisor.com`, Google ou Facebook est
refusée au niveau du proxy (`403 CONNECT`).

Les pages ont pu être **lues** (via un service d'extraction tiers, côté serveur), ce qui
a permis de récupérer les textes, la carte, les avis et les **URL** des images — mais
aucun fichier binaire n'a pu être rapatrié.

D'où ce parti pris : plutôt que de remplir la maquette avec des banques d'images
génériques qui n'ont rien à voir avec le lieu, le site affiche des visuels d'attente
explicites et vous livre la liste exacte des vraies photos à récupérer.

---

## 4. Récupérer les photos en une commande

Depuis votre machine, à la racine du dépôt :

```bash
bash maitai/docs/telecharger-images.sh
```

Le script télécharge les images listées en §2.1 et §2.2 dans
`maitai/images/_a-trier/`. Il ne touche à rien d'autre : à vous ensuite de choisir,
recadrer, compresser et renommer selon le tableau du §1.

---

## 5. Droits d'usage — à trancher avant la mise en ligne publique

Vous avez indiqué vouloir « les meilleures photos, peu importe de qui ». Voici l'état
réel du sujet, pour que l'arbitrage soit fait en connaissance de cause :

| Origine | Statut | Recommandation |
|---|---|---|
| Photos de `croc-parc.re` | Vos fichiers | ✅ Utilisation libre |
| Photos déposées par l'établissement sur Tripadvisor | Vos fichiers, hébergés par un tiers | ✅ Utilisation libre — préférez le fichier original à la version servie par leur CDN |
| Photos déposées par des **clients** sur Google / Tripadvisor | Appartiennent à leurs auteurs | ⚠️ Reproduction sur un site commercial sans autorisation. Le risque est faible en pratique, mais il existe. Une simple demande par message privé règle la question. |
| Photos de presse (Zinfos974, Clicanoo…) | Appartiennent au média | ❌ À éviter |

À ce stade, **aucune photo de client n'a été intégrée** — la question ne se pose donc
pas encore. Elle se posera au moment où vous piocherez dans les photos Google.

---

## 6. Quand vous remplacez une image

1. Déposez le fichier dans le bon sous-dossier de `images/`.
2. Dans `index.html`, remplacez le chemin du `PLACEHOLDER-…svg` par le nouveau nom.
   Chaque image n'apparaît **qu'une seule fois** dans le fichier : une recherche du
   nom suffit.
3. **Mettez à jour l'attribut `alt`** si le sujet de la photo change. Il sert aux
   personnes malvoyantes et au référencement.
4. Supprimez le SVG d'attente devenu inutile.
5. Pour l'image d'accueil, pensez aussi à la balise `og:image` en haut du fichier
   (c'est la vignette affichée quand le lien est partagé sur les réseaux).

Compressez avant de mettre en ligne : [squoosh.app](https://squoosh.app), gratuit, dans
le navigateur. Une photo de 4 Mo sortie du téléphone fait s'effondrer le temps de
chargement sur mobile — objectif : moins de 350 Ko pour l'image d'accueil, moins de
200 Ko pour les autres.
