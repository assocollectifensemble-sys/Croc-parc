# Traçabilité des informations affichées sur le site

Règle appliquée pendant toute la production : **aucune information n'est écrite sur le
site si elle n'est pas confirmée par au moins une source vérifiable, ou par le client.**

Ce fichier permet de vérifier chaque affirmation, et surtout de savoir ce qui reste
fragile.

Légende :
- ✅ **Confirmé** — source directe ou validation client
- 🟡 **Plausible** — déduit de sources fiables mais non confirmé directement
- 🔴 **À confirmer** — affiché sur le site mais non vérifié, ou pas affiché faute de source

---

## 1. Identité et coordonnées

| Information affichée | Statut | Source |
|---|---|---|
| Nom « Le Maï-Taï by Croc Parc » | ✅ | Page Facebook officielle, fiche Tripadvisor, site croc-parc.re |
| Adresse : 1 route forestière, forêt de l'Étang-Salé, 97427 L'Étang-Salé | ✅ | croc-parc.re, Pages Jaunes, Tripadvisor |
| Mention « entrée 2 du Croc Parc » | ✅ | croc-parc.re (page restaurant) |
| Téléphone 0692 39 42 00 | ✅ | croc-parc.re + Pages Jaunes, **confirmé par le client** comme ligne de réservation |
| Page Facebook du restaurant | ✅ | facebook.com/profile.php?id=61565124304200 |

---

## 2. Horaires

| Information affichée | Statut | Source |
|---|---|---|
| Mardi → dimanche, 11h30 – 14h | ✅ | croc-parc.re + **confirmé par le client** |
| Service du midi uniquement | ✅ | Aucune source ne mentionne de service du soir ; **confirmé par le client** |
| 7j/7 pendant les vacances scolaires | ✅ | **Confirmé par le client** |
| Fermeture le lundi hors vacances | ✅ | Déduction directe de « mardi → dimanche », confirmée par le client |

> ⚠️ Le site n'affiche **aucun** horaire de service du soir, ni aucune ouverture de
> jour férié, faute de source.

---

## 3. Offre culinaire

| Information affichée | Statut | Source |
|---|---|---|
| « Cuisine du monde » | ✅ | Formulation reprise du site croc-parc.re |
| Carte à l'ardoise, selon l'inspiration du chef | ✅ | croc-parc.re |
| Suggestions renouvelées chaque semaine | ✅ | croc-parc.re |
| Carte publiée sur les réseaux sociaux | ✅ | croc-parc.re (« consultez la carte de la semaine sur nos réseaux ») |
| **Prix, formules, ticket moyen** | 🔴 | **Aucune source fiable — volontairement absent du site** |
| **Noms de plats précis** | 🔴 | Voir §7 — seuls des plats sourcés par des avis clients sont mentionnables |

---

## 4. Le lieu et son environnement

| Information affichée | Statut | Source |
|---|---|---|
| Forêt domaniale de l'Étang-Salé, ~1 000 ha, gérée par l'ONF | ✅ | ONF / sudreuniontourisme.fr / letangsale.fr (922 ha selon l'ONF, ~1 000 ha communément cité) |
| Essences : filaos, tamarins des Indes, eucalyptus, flamboyants | ✅ | guide-reunion.fr, sudreuniontourisme.fr |
| Croc Parc : 4,7 hectares | ✅ | petitfute.fr, guide-reunion.fr |
| Animaux : crocodiles du Nil, lémuriens, tortues étoilées, paons | ✅ | petitfute.fr, croc-parc.re, guide-reunion.fr |
| Jeux gonflables et aire de jeux enfants | ✅ | petitfute.fr (« jeux gonflables, aire de jeux pour enfants ») |
| Balançoires | 🟡 | Mentionné dans le brief client ; les sources publiques parlent d'« aire de jeux » sans détailler |
| « Espace clos et ombragé, les petits restent en vue » | 🟡 | Cohérent avec la configuration du parc, **à faire valider par le client** |
| Parking sur place | 🟡 | Un parc animalier de cette taille en dispose nécessairement ; **non confirmé par une source écrite** |

---

## 5. Temps de trajet affichés

| Information affichée | Statut | Base de calcul |
|---|---|---|
| ≈ 10 min depuis l'Étang-Salé-les-Bains | 🟡 | Distance routière ; **estimation, à valider** |
| ≈ 15 min depuis Les Avirons ou Saint-Louis | 🟡 | Idem |
| ≈ 25 min depuis Saint-Pierre | 🟡 | Idem |

Ces temps sont présentés sur le site comme « indicatifs, hors heures de pointe ». Ils
sont volontairement arrondis et prudents. À corriger si le client connaît les valeurs
réelles.

---

## 6. Coordonnées GPS

Le site utilise **-21,2650 / 55,3600** pour la carte et le bloc de données
structurées. Ce point est celui du Croc Parc dans la forêt de l'Étang-Salé.

🔴 **À affiner.** Un relevé exact de l'entrée 2 (celle du restaurant) donnerait un
meilleur guidage GPS. C'est une correction d'une minute : voir README §
« Modifier les informations pratiques ».

---

## 7. Avis clients

Les avis affichés sur le site sont des **citations exactes**, non reformulées, avec
mention de leur auteur, de leur date et de leur plateforme d'origine.

*(Section complétée à l'issue de la collecte — voir le tableau ci-dessous.)*

---

## 8. Récapitulatif — ce qui reste à confirmer

Par ordre d'importance pour la conversion :

1. 🔴 **Le repas est-il accessible sans billet d'entrée du parc ?** C'est la question la
   plus déterminante du site. Toute la section « pause déjeuner en semaine » repose
   dessus. Aucune source publique ne le dit clairement.
2. 🔴 **Existe-t-il une formule ou un plat du jour le midi, et à quel prix ?** Sans
   réponse, le site ne peut afficher aucun tarif — ce qui fait perdre des visiteurs qui
   comparent avant d'appeler.
3. 🔴 **Combien de temps dure un déjeuner ?** L'argument « pause d'une heure » est
   décisif pour la cible active mais n'est pas sourcé.
4. 🟡 **Le parking est-il gratuit et directement accessible par l'entrée 2 ?**
5. 🟡 **Les balançoires et les jeux gonflables sont-ils accessibles aux clients du
   restaurant, ou réservés aux visiteurs du parc ?**
6. 🟡 **Accepte-t-on les groupes, les anniversaires d'enfants, les privatisations ?**
   Fort potentiel commercial, aucune source. Non mentionné sur le site.
7. 🟡 **Accessibilité PMR, moyens de paiement acceptés, wifi.** Non mentionnés faute
   de source — ce sont pourtant des attributs que Google valorise.
8. 🔴 **Coordonnées GPS exactes de l'entrée 2.**
