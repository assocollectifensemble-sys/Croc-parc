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
| `restaurant groupes / anniversaire enfant Étang-Salé` | À activer **seulement** si confirmé (voir « À me confirmer ») |

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
| `restaurant créole Réunion` | **Le restaurant annonce une cuisine « du monde », pas créole.** Se positionner dessus créerait une déception à l'arrivée — mauvais pour les avis, donc mauvais pour le SEO local à moyen terme. |
| `restaurant gastronomique` / `restaurant romantique` | Contredit le positionnement familial et le service du midi uniquement. |
| `restaurant pas cher Étang-Salé` | Aucune donnée tarifaire confirmée. On n'écrit pas de promesse de prix non sourcée. |
| `hôtel`, `mariage`, `séminaire` | Aucune source ne confirme ces prestations. À rouvrir si le client les confirme. |

---

## 4. Traduction technique (ce qui est déjà en place dans `index.html`)

- **`<title>`** : `Le Maï-Taï by Croc Parc — Restaurant en pleine forêt à l'Étang-Salé
  (La Réunion)`. Marque + différenciant + ville + région, sous 65 caractères utiles.
- **Meta description** : intègre l'appel à l'action téléphonique et les deux publics.
- **Un seul `<h1>`**, les `<h2>` reprennent les intentions de niveau 1.
- **JSON-LD `Restaurant`** avec `servesCuisine`, `openingHoursSpecification`,
  `geo`, `telephone`, `address`, `amenityFeature` (aire de jeux), `containedInPlace`
  (Croc Parc) et `aggregateRating`. C'est ce qui alimente le panneau de connaissances
  et le rich snippet étoiles.
- **`<html lang="fr-RE">`** : signal de variante régionale.
- **Balises `alt` descriptives et localisées** sur toutes les images.
- **Liens sortants** vers les fiches Google/Tripadvisor/Facebook officielles : cohérence
  de l'écosystème (le NAP — Name, Address, Phone — doit être **strictement identique**
  partout, c'est le premier facteur de SEO local).

---

## 5. Actions hors-site à mener (hors périmètre de ce livrable, mais décisives)

Le SEO local se joue à ~60 % en dehors du site. Par ordre de rendement :

1. **Revendiquer et compléter la fiche Google Business Profile du restaurant**
   (distincte de celle du parc) : catégorie principale « Restaurant », horaires,
   attributs « adapté aux enfants », « terrasse », photos, et surtout le **lien vers ce
   site** dans le champ « Site Web ». C'est l'action à plus fort impact, loin devant tout
   le reste.
2. **Uniformiser le NAP** sur Tripadvisor, Facebook, Pages Jaunes, Mappy, Petit Futé :
   même orthographe du nom, même adresse, même numéro. Les divergences actuelles
   (`Maï-Taï` / `MAÏ-TAÏ` / `Mai Tai`) diluent le signal.
3. **Publier la carte de la semaine sur Facebook avec une légende contenant les
   mots-clés** (« la carte de la semaine au Maï-Taï, restaurant du Croc Parc à
   l'Étang-Salé ») — le contenu social frais nourrit la fiche Google.
4. **Demander des avis Google**, pas seulement Tripadvisor : c'est Google qui décide de
   l'affichage dans le pack local.
5. **Obtenir un lien depuis les sites institutionnels** : `sudreuniontourisme.fr`,
   `reunion.fr`, `letangsale.fr`, offices de tourisme. Ce sont des backlinks locaux de
   forte autorité, accessibles gratuitement sur simple demande.

---

## 6. Ce qu'on mesurera

Une fois le domaine branché : Search Console (requêtes réelles vs. hypothèses ci-dessus)
et le nombre d'appels générés. Le KPI n'est pas le trafic — c'est **le nombre d'appels
au 0692 39 42 00**. Les liens `tel:` sont traçables via un événement analytics ; le point
d'accroche est déjà prévu dans `js/main.js`.
