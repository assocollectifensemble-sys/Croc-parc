# Le Maï-Taï — Mini-charte graphique

Direction retenue : **Sous la Varangue** — la matière du lieu (bois, varangue,
canopée) et son vrai logo (lettrage bambou dessiné à la main) comme décor,
le tiki en accent discret plutôt qu'en thème appuyé.

## Palette

| Couleur | Usage | Hex |
|---|---|---|
| ⬛ Brun sombre | Texte principal, fonds sombres | `#241811` |
| 🟫 Brun moyen | Texte secondaire | `#4A3626` |
| 🟩 Vert forêt | Bandeaux de sécurité, accents | `#24331D` |
| 🟧 Terracotta | Couleur signature (tables du resto), CTA, prix | `#B5432B` |
| ⬜ Crème | Fond clair, texte sur fond sombre | `#F5EEDF` |
| 🟨 Or | Accent rare, liseré | `#C89B3C` |

## Typographies (Google Fonts)

- **Fraunces** (italique, graisse 900) — accroches, noms de plat/événement
- **Barlow Semi Condensed** (600/700) — dates, kickers, boutons
- **Inter** (400 à 700) — texte courant, détails
- **Permanent Marker** — uniquement pour le mot "Maï-Taï" du bloc logo

## Hiérarchie

Toujours 3 niveaux, jamais plus :
1. **Accroche** — le mot ou les 2-3 mots qui se lisent en 1 seconde
2. **Info clé** — date, prix, ou élément qui déclenche l'action
3. **Détails** — horaires, conditions, CTA — plus petits, jamais en concurrence visuelle avec les niveaux 1 et 2

## Zones de sécurité

- **Story (1080×1920)** : 250 px en haut et en bas sans aucun texte (masqués par l'interface Instagram). Les bandeaux de couleur pleine y sont autorisés, jamais du texte informatif.
- **Marges latérales** : 72 px minimum de chaque côté sur tous les formats.
- Le numéro de téléphone est toujours affiché dans un bouton plein (fond terracotta), jamais en texte seul, pour rester lisible sur une vignette de 300 px de large.

## À faire / à ne pas faire

**À faire**
- Un seul message dominant par visuel — tout le reste est secondaire
- Toujours passer par les variables en haut de chaque fichier, jamais de texte codé en dur ailleurs
- Garder le bloc logo (bambou + "Maï-Taï") identique sur toutes les publications
- Vérifier le contraste texte/fond en plein soleil (les couleurs de `design-tokens.css` sont déjà calibrées AA)

**À ne pas faire**
- Ne pas ajouter une 4e couleur ou une nouvelle police sans repasser par cette charte
- Ne pas empiler plusieurs informations à la même taille
- Ne pas utiliser d'emoji dans le visuel — les pictogrammes sont en SVG (voir `design-tokens.css`)
- Ne pas laisser le placeholder "Photo du plat / de l'événement" dans une publication publiée — remplacer par une vraie photo ou par un aplat de couleur de la palette

## Mode d'emploi (10 lignes)

1. Ouvrez le fichier du template voulu (`templates/annonce`, `templates/menu-du-jour` ou `templates/evenement`), dossier `carre` ou `story` selon le format.
2. Repérez le bloc `/* ===== À MODIFIER ===== */` tout en haut du fichier.
3. Changez uniquement le texte entre guillemets `" "` (accents et apostrophes compris, gardez les guillemets).
4. Pour une photo : remplacez l'adresse dans `--mt-photo:url('...')`, puis supprimez le petit bloc marqué `SUPPRIMER SI PHOTO RÉELLE` juste en dessous dans le fichier.
5. Enregistrez le fichier.
6. Ouvrez un terminal dans le dossier du projet et lancez `node build.mjs` — les 6 images se régénèrent dans `/output`.
7. Pour ne régénérer qu'un seul visuel : `node build.mjs annonce` (ou `menu-du-jour`, `evenement`).
8. Les fichiers PNG dans `/output` sont prêts à poster tels quels.
9. En cas de doute sur une couleur ou une taille, ne changez rien dans `design-tokens.css` sans repasser par cette charte.
10. Besoin d'un 4e type de visuel ? Dupliquez le template le plus proche et adaptez-le — ne repartez jamais de zéro.
