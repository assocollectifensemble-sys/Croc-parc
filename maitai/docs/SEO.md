# Stratégie SEO local — Le Maï-Taï by Croc Parc

Document de travail de l'agent Contenu/SEO. Il explique **pourquoi** chaque mot-clé a
été retenu, pour que les arbitrages soient rediscutables plus tard.

---

## 1. Le constat de départ

Recherche effectuée en août 2026 sur les requêtes du bassin sud/ouest de La Réunion.
Trois choses ressortent :

1. **Le restaurant n'existe pas dans les résultats organiques.** Sur `restaurant Maï-Taï
   Croc Parc`, Google ne renvoie que des fiches tierces : Tripadvisor, Facebook,
   Pages Jaunes, Petit Futé, Mappy. Aucune page contrôlée par la marque. Tout le trafic
   de marque est capté par des intermédiaires qui affichent des informations partielles.
2. **La requête « restaurant avec jeux pour enfants » est mal servie localement.** Les
   résultats renvoient vers des annuaires génériques (Pages Jaunes), des articles de
   blog (LaPetiteCréole), McDonald's et Happy Kids. Aucun restaurant *en nature* ne
   se positionne. C'est un angle mort exploitable.
3. **Le pôle « Étang-Salé » est concurrentiel côté plage, désert côté forêt.** Les
   restaurants qui se positionnent sont ceux de l'Étang-Salé-les-Bains (front de mer)
   et de l'avenue Raymond Barre. Personne ne revendique le créneau « déjeuner en forêt ».
4. **La preuve sociale est à zéro.** La fiche Tripadvisor du restaurant affiche
   littéralement « Pas encore d'avis ». Or les avis sont le premier facteur de
   classement dans le pack local Google. Voir § 5.

**Conclusion stratégique :** on ne se bat pas sur `restaurant Étang-Salé` (trop
concurrentiel, intention trop large). On construit la page autour de **trois angles où
l'offre réelle est unique** : la forêt, les enfants, et la proximité du parc animalier.

---

## 2. Mots-clés retenus

### Niveau 1 — Requêtes cibles principales (structurent H1/H2 et le title)

| Mot-clé | Intention | Justification |
|---|---|---|
| `restaurant Croc Parc` | Navigationnelle | Le parc est déjà connu et référencé. Les visiteurs cherchent où manger sur place **avant** de venir. Requête à faible volume mais conversion très haute. |
| `où manger près de Croc Parc` / `restaurant près de Croc Parc Étang-Salé` | Locale, immédiate | Formulation naturelle en mobilité. Actuellement captée par la page Tripadvisor « Les 10 meilleurs restaurants près de Croc Parc » — donc par la **concurrence**. À récupérer. |
| `restaurant avec jeux pour enfants Réunion` | Locale, projet de sortie | Angle mort identifié (cf. §1.2). Le Maï-Taï a un argument réel et différenciant : jeux gonflables + aire de jeux + animaux. |
| `restaurant famille Étang-Salé` | Locale | Volume correct, intention claire, concurrence non spécialisée famille. |
| `restaurant forêt Étang-Salé` / `manger dans la forêt Étang-Salé` | Locale, expérientielle | Zéro concurrence. La forêt domaniale (~1 000 ha, ONF) est une destination de week-end très fréquentée : ces visiteurs sont déjà sur place et ont faim. |

### Niveau 2 — Requêtes secondaires (portées par les sections et le corps de texte)

| Mot-clé | Où il vit dans la page |
|---|---|
| `déjeuner Étang-Salé` / `restaurant midi Étang-Salé` | Section « La pause déjeuner » |
| `restaurant Étang-Salé les Hauts` | Bloc accès + adresse + JSON-LD |
| `sortie famille Sud Réunion` / `sortie famille sud sauvage` | Section famille + méta description |
| `restaurant jeux gonflables Réunion` | Section famille, liste des équipements |
| `restaurant terrasse nature Réunion` | Section histoire du lieu |
| `manger près de la forêt de l'Étang-Salé` | Section accès |
| `restaurant Étang-Salé réservation téléphone` | Bloc réservation + appel final |
| `restaurant parking gratuit Étang-Salé` | Bandeau d'accueil + bloc accès |
| `anniversaire enfant Étang-Salé` | Carte famille — confirmé par croc-parc.re et par les avis |

### L'angle que personne n'a vu venir

La recherche a fait remonter une phrase du site officiel qui vaut à elle seule une
section du site :

> « Pour y accéder, un portail privatif se trouvant à 300 mètres de l'entrée principale
> en direction du Golf Bourbon vous permettra de vous garer à proximité **si vous êtes
> pressés et souhaitez uniquement venir déjeuner au parc à votre pause**. »

C'est exactement la promesse que cherche la cible « actifs en semaine », et elle est
déjà vraie — elle était simplement enterrée dans une page interne du site du parc. Elle
répond à l'objection numéro un (« un restaurant dans un parc animalier, ça doit être
compliqué et long »). Elle structure désormais la carte « pause déjeuner » et le bloc
accès, et sert les requêtes du type `déjeuner rapide Étang-Salé`,
`restaurant accès direct parking`.

### Niveau 3 — Requêtes de proximité géographique (maillage local)

`restaurant Les Avirons`, `restaurant Saint-Louis 974 midi`, `restaurant Saint-Pierre
famille`, `restaurant Étang-Salé-les-Bains`. Elles ne sont **pas** ciblées frontalement
(on ne va pas mentir sur la localisation) mais servies indirectement par le bloc
« Combien de temps pour venir ? » qui cite ces communes avec des temps de trajet.
C'est le pattern classique du SEO local : on se rend pertinent pour les communes
voisines sans keyword stuffing.

---

## 3. Mots-clés volontairement écartés

| Écarté | Pourquoi |
|---|---|
| `meilleur restaurant Réunion` | Intention trop large, aucune chance de positionnement, aucun rapport avec l'offre. |
| `restaurant créole Réunion` | **La carte relevée n'a rien de créole** (salade César, salade italienne, foie gras, risotto, mahi-mahi, crème brûlée). Se positionner dessus créerait une déception à l'arrivée — mauvais pour les avis, donc mauvais pour le SEO local à moyen terme. |
| `cuisine du monde` | Formulation employée par croc-parc.re, mais Tripadvisor classe l'établissement en « Française / Européenne » et la carte le confirme. Terme trop vague pour porter du trafic, et en contradiction avec la réalité observée. Le site ne colle donc **aucune étiquette de cuisine** et laisse parler les plats — arbitrage à faire avec le chef. |
| `restaurant gastronomique` / `restaurant romantique` | Contredit le positionnement familial et le service du midi uniquement. |
| `restaurant pas cher Étang-Salé` | Aucune donnée tarifaire confirmée. On n'écrit pas de promesse de prix non sourcée. |
| `hôtel`, `mariage`, `séminaire` | Aucune source ne confirme ces prestations. À rouvrir si le client les confirme. |

---

## 4. Traduction technique (ce qui est déjà en place dans `index.html`)

- **`<title>`** : `Le Maï-Taï by Croc Parc — Restaurant en pleine forêt à l'Étang-Salé
  (La Réunion)`. Marque + différenciant + ville + région, sous 65 caractères utiles.
- **Meta description** : intègre l'appel à l'action téléphonique et les deux publics.
- **Un seul `<h1>`**, les `<h2>` reprennent les intentions de niveau 1.
- **JSON-LD `Restaurant`** avec `servesCuisine`, `priceRange`, `paymentAccepted`,
  `openingHoursSpecification`, `geo`, `telephone`, `email`, `address`, `amenityFeature`
  (aire de jeux, parking, PMR) et `containedInPlace` (Croc Parc).
  **Pas de `aggregateRating`** : il n'y a aucune note à déclarer aujourd'hui, et
  déclarer une note inexistante est une violation des consignes Google qui peut coûter
  l'affichage des rich snippets. À ajouter le jour où les avis arrivent.
- **`<html lang="fr-RE">`** : signal de variante régionale.
- **Balises `alt` descriptives et localisées** sur toutes les images.
- **Liens sortants** vers les fiches Google/Tripadvisor/Facebook officielles : cohérence
  de l'écosystème (le NAP — Name, Address, Phone — doit être **strictement identique**
  partout, c'est le premier facteur de SEO local).

---

## 5. Actions hors-site à mener (hors périmètre de ce livrable, mais décisives)

Le SEO local se joue à ~60 % en dehors du site. Par ordre de rendement décroissant :

1. **Collecter des avis. C'est l'urgence absolue.**
   La fiche Tripadvisor affiche « Pas encore d'avis ». Un restaurant sans avis ne
   remonte pas dans le pack local, quelle que soit la qualité du site. Le levier :
   demander l'avis **en fin de repas, avec un QR code sur l'addition**, en visant
   **Google en priorité** (c'est Google qui décide du pack local, pas Tripadvisor).
   Objectif réaliste : 20 avis en trois mois. Ça change tout.

2. **Revendiquer et compléter la fiche Google Business Profile du restaurant**
   (distincte de celle du parc) : catégorie principale « Restaurant », horaires,
   attributs « adapté aux enfants », « terrasse », « parking gratuit », photos, et le
   **lien vers ce site** dans le champ « Site Web ».

3. **Corriger la géolocalisation Tripadvisor.**
   Leur fiche place le restaurant à −21,13057 / 55,30595, près de **Saint-Leu**, à une
   dizaine de kilomètres de la réalité — d'où leurs suggestions de « restaurants
   proches » situés à Saint-Leu. Une position fausse pollue tout le référencement local.
   Correction gratuite via « Suggérer une modification » sur la fiche.

4. **Uniformiser le NAP** (*Name, Address, Phone*) sur Tripadvisor, Facebook, Pages
   Jaunes, Mappy, Petit Futé. Le nom circule aujourd'hui sous quatre formes
   (`Le Maï-Taï`, `MAÏ-TAÏ`, `Restaurant le maï taï by croc parc`, `Mai Tai`) : chaque
   variante dilue le signal. Choisir une graphie officielle et l'imposer partout.

5. **Publier la carte de la semaine sur Facebook avec une légende contenant les
   mots-clés** (« la carte de la semaine au Maï-Taï, restaurant du Croc Parc à
   l'Étang-Salé ») — le contenu social frais nourrit la fiche Google.

6. **Ajouter l'ouverture 7j/7 en vacances scolaires sur croc-parc.re et sur Google.**
   L'information est réelle mais n'apparaît nulle part publiquement : c'est du trafic
   perdu pendant les périodes les plus fréquentées de l'année.

7. **Obtenir un lien depuis les sites institutionnels** : `sudreuniontourisme.fr`,
   `reunion.fr`, `letangsale.fr`, offices de tourisme. Backlinks locaux de forte
   autorité, accessibles gratuitement sur simple demande.

---

## 6. Ce qu'on mesurera

Une fois le domaine branché : Search Console (requêtes réelles vs. hypothèses ci-dessus)
et le nombre d'appels générés. Le KPI n'est pas le trafic — c'est **le nombre d'appels
au 0692 39 42 00**. Les liens `tel:` sont traçables via un événement analytics ; le point
d'accroche est déjà prévu dans `js/main.js`.
