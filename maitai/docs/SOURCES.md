# Traçabilité des informations affichées sur le site

Règle appliquée pendant toute la production : **aucune information n'est écrite sur le
site si elle n'est pas confirmée par au moins une source vérifiable, ou par le client.**

Légende :
- ✅ **Confirmé** — source directe ou validation client
- 🟡 **Plausible** — déduit de sources fiables, non confirmé directement
- 🔴 **À confirmer**

Sources principales consultées le **13 août 2026** :
- `croc-parc.re` — site officiel, pages *Accueil* et *La restauration* (**source la plus fiable**)
- Fiche Tripadvisor du restaurant (page **attribuée**, gérée par l'établissement)
- Pages Jaunes, Petit Futé, guide-reunion.fr, sudreuniontourisme.fr, letangsale.fr
- Confirmations directes du client (téléphone, horaires, photos, déploiement)

---

## 1. Identité et coordonnées

| Information affichée | Statut | Source |
|---|---|---|
| Nom « Le Maï-Taï by Croc Parc » | ✅ | croc-parc.re (« Le Maï-Taï, notre restaurant »), Tripadvisor, Facebook |
| Adresse : 1 route forestière, forêt de l'Étang-Salé, 97427 | ✅ | croc-parc.re, Tripadvisor (« 1 Route Forestiere Croc parc ») |
| Téléphone 0692 39 42 00 | ✅ | Tripadvisor (`+262 692 39 42 00`), Pages Jaunes — **confirmé par le client** |
| E-mail `maitaicrocparc@gmail.com` | ✅ | Fiche Tripadvisor |
| Page Facebook du restaurant | ✅ | Lien officiel présent dans l'en-tête de croc-parc.re |

> ⚠️ **Le nom s'écrit de quatre façons différentes selon les plateformes** :
> `Le Maï-Taï`, `MAÏ-TAÏ`, `Restaurant le maï taï by croc parc`, `Mai Tai`.
> Cette dispersion affaiblit le référencement local. Voir `SEO.md` § 5.2.

---

## 2. Horaires

Le rythme n'est **pas uniforme** sur la semaine. C'est la correction la plus tardive
de la mission, faite à partir des visuels de communication transmis par le client
(affiches « Nou artourne ! » et « Biz tot vacances scolaires », août 2026).

| Information affichée | Statut | Source |
|---|---|---|
| Mardi → vendredi, 11h30 – 14h, portail privatif ouvert | ✅ | Affiche officielle : « NOTRE PORTAIL SERA OUVERT DU MARDI AU VENDREDI (LUNDI FERMÉ) » |
| Samedi & dimanche : sur réservation uniquement, par l'entrée principale | ✅ | Affiche officielle : « SAMEDI ET DIMANCHE SUR RÉSERVATION UNIQUEMENT ET ENTRÉE PRINCIPALE DE CROC PARC » |
| Lundi : fermé | ✅ | Affiches + tableau horaire Tripadvisor |
| Service du midi uniquement | ✅ | Aucune source ne mentionne de service du soir ; Tripadvisor liste le repas « Déjeuner » |
| 7j/7 pendant les vacances scolaires | ✅ | **Confirmé par le client** |

> Les affiches annoncent un **retour au rythme normal le mardi 18 août 2026**, à la fin
> des vacances scolaires. Le site décrit donc ce rythme normal **sans mentionner de
> date** : une date de réouverture périme en quelques jours et le site n'a pas vocation
> à être remis à jour chaque semaine. Si vous voulez l'afficher malgré tout pendant la
> semaine qui précède, c'est un bandeau à ajouter puis à retirer — dites-le-moi.

> ⚠️ **La formulation de croc-parc.re est incomplète.** « Ouvert du mardi au dimanche
> midi de 11h30 à 14h » ne dit pas que le week-end est sur réservation et passe par
> l'entrée principale. Un client qui se présente sans réserver un samedi repart déçu.
> À corriger sur le site du parc **et** sur la fiche Google.

**Le parc**, lui (contexte, non affiché comme horaire du restaurant) : 10h–17h, du mardi
au dimanche hors vacances scolaires, 7j/7 pendant les vacances et jours fériés.
Tarif unique **15 € par personne** dès 3 ans, gratuit en dessous, 5 € en scolaire.

---

## 3. Offre culinaire

| Information affichée | Statut | Source |
|---|---|---|
| **Menu du midi à 26 € — entrée, plat, dessert, places limitées** | ✅ | Affiches officielles : « ON VOUS PRÉPARE UN MENU À 26€ (ENTRÉE PLAT DESSERT) MAIS IL N'Y EN AURA PAS POUR TOUT LE MONDE ! » — **confirmé par le client** |
| « Des suggestions qui se renouvellent chaque semaine » | ✅ | croc-parc.re, mot pour mot |
| « La carte de la semaine est publiée sur nos réseaux sociaux » | ✅ | croc-parc.re |
| Les 6 plats et leurs prix affichés | ✅ | **Menu publié sur la fiche Tripadvisor**, relevé le 13/08/2026 |
| Gamme de prix €€-€€€ (JSON-LD) | ✅ | Classification Tripadvisor |
| Cuisine « Française, Européenne » (JSON-LD) | ✅ | Catégories Tripadvisor. Cohérent avec la carte relevée |
| Cartes bancaires (Visa, Mastercard, Amex) | ✅ | Fiche Tripadvisor |
| Croc'Snack : burgers, sandwichs, salades, samoussas, glaces, gaufres | ✅ | croc-parc.re |
| Pique-nique autorisé, kiosques ombragés | ✅ | croc-parc.re |

> 🔴 **Point de vigilance.** Le site officiel décrit une « cuisine du monde », tandis que
> Tripadvisor classe l'établissement en « Française / Européenne » et que la carte
> relevée est plutôt française-méditerranéenne. Le site ne tranche pas : il ne colle
> aucune étiquette de cuisine et laisse parler les plats. **À arbitrer avec le chef** —
> c'est une décision de positionnement, pas de rédaction.

> 🔴 **La carte affichée est datée.** Elle est présentée comme « un aperçu », pas comme la
> carte du jour. Si elle change beaucoup, il faudra la mettre à jour ou la retirer.

---

## 4. Le lieu

| Information affichée | Statut | Source |
|---|---|---|
| « Dans la forêt d'Étang-Salé, dans un écrin de verdure… sous notre varangue ou côté jardin » | ✅ | **Citation exacte** de la présentation Tripadvisor de l'établissement |
| Croc Parc créé en 1999 (par Georges Flour), 4,7 hectares | ✅ | croc-parc.re |
| Forêt protégée d'Étang-Salé | ✅ | croc-parc.re |
| Filaos, tamarins des Indes | ✅ | guide-reunion.fr, sudreuniontourisme.fr |
| Crocodiles du Nil, makis catta, paons bleus, tortues étoilées, mini-ferme | ✅ | croc-parc.re (page *Les animaux*) |
| Mini-golf, châteaux gonflables, aire de jeux sur une grande esplanade | ✅ | croc-parc.re : « les enfants pourront profiter du mini-golf, des gonflables, de l'aire de jeux » |
| « Espace vert pour enfants… dans un cadre agréable et sécurisé » | ✅ | **Citation exacte** de croc-parc.re |
| Anniversaires d'enfants organisés sur place | ✅ | croc-parc.re + nombreux avis clients détaillés |
| Balançoires | 🔴 | Mentionné dans votre brief, **aucune source publique** — volontairement **absent du site** |

---

## 5. Accès et services

| Information affichée | Statut | Source |
|---|---|---|
| Portail privatif à 300 m de l'entrée principale, direction Golf Bourbon | ✅ | croc-parc.re, mot pour mot — **c'est l'argument clé du déjeuner en semaine** |
| Portail privatif ouvert **du mardi au vendredi** | ✅ | Affiches officielles |
| Déjeuner faisable **en une heure** | ✅ | **Confirmé par le client** (« le déjeuner peut être très rapide, en une heure c'est fait, ils sont très bons ») |
| Après le déjeuner : entrée du parc à **8 € pour les enfants** (au lieu de 15 €), **offerte pour les adultes** | 🟡 | **Communiqué par le client**, qui précise qu'il s'agit d'un **arrangement** et non d'une offre officielle, et qu'il le **fera valider par le gérant**. Publié à sa demande explicite — voir § 7 |
| Parking privatif gratuit | ✅ | croc-parc.re (« un parking privatif pour vos évènements et le restaurant ») + Tripadvisor (« Parking privé gratuit ») |
| Accessible PMR et poussettes | ✅ | croc-parc.re (FAQ *Accessibilité*) |
| Temps de trajet (10 / 15 / 25 min) | 🟡 | **Estimations**, présentées comme indicatives sur le site |
| Coordonnées GPS −21,2650 / 55,3600 | 🟡 | Point approximatif du Croc Parc |

> 🔴 **Bug à signaler à Tripadvisor.** Leur fiche géolocalise le restaurant à
> **−21,13057 / 55,30595**, soit près de Saint-Leu — à une dizaine de kilomètres de la
> réalité. C'est ce qui explique qu'ils proposent des « restaurants proches » situés à
> Saint-Leu. Une correction via « Suggérer une modification » vaut le détour : une
> position fausse dégrade tout le référencement local.

---

## 6. Avis clients — le vrai constat

**La fiche Tripadvisor du restaurant affiche « Pas encore d'avis » (0 avis).**
La demande initiale (« mettre en avant les avis Tripadvisor ») ne pouvait donc pas être
satisfaite telle quelle. Plutôt que d'inventer ou de recycler des avis sans rapport, le
site affiche ce qui existe réellement, attribué et étiqueté.

| Avis affiché | Plateforme | Porte sur | Traitement |
|---|---|---|---|
| « Compass00450009459 » — *Belle découverte, le Goût lé là !!!!* | Tripadvisor | **Le restaurant** | Mis en avant. **Tronqué**, voir ci-dessous |
| Boris Wattier | Google | Le restaurant (dans une visite du parc) | Cité intégralement |
| Avis anonyme | Google | **Le parc** | Étiqueté « à propos du parc » |
| Dorothée T | Tripadvisor | **Le parc** (anniversaire) | Étiqueté « à propos du parc » |
| Coraly M | Tripadvisor | **Le parc** (anniversaire) | Étiqueté « à propos du parc » |

Ces avis sont repris du **widget d'avis affiché sur croc-parc.re**, qui agrège Google et
Tripadvisor.

### La troncature, en toute transparence

Le texte intégral de l'avis mis en avant se termine par :

> « […] ENTRÉES AU CROC PARC " GRATUITES" DU COUP .✌️ »

Cette phrase a été **retirée**, la coupure étant signalée par `[…]`. Raison : elle
laisse entendre que l'entrée du parc est offerte aux clients du restaurant. C'est
peut-être exact, mais **aucune source officielle ne le confirme**, et une promesse
tarifaire non tenue se paie très cher en avis négatifs. → Voir § 7, point 1.

C'est probablement l'argument commercial le plus fort dont vous disposez pour la cible
« déjeuner en semaine ». S'il est exact, il mérite d'être affiché en grand.

---

## 7. Ce qu'il reste à confirmer

Par ordre d'impact sur la conversion :

1. 🟡 **L'avantage parc doit être validé par le gérant.**
   Le site annonce aujourd'hui : après le déjeuner, entrée du parc à **8 € pour les
   enfants** au lieu de 15 €, **offerte pour les adultes**. C'est publié à la demande
   explicite du client, qui a précisé qu'il s'agit d'un **arrangement** et non d'une
   offre officielle, et qu'il le ferait valider.
   **C'est la seule information du site qui promet un tarif.** Si le gérant ne la
   confirme pas, il faut la retirer sans attendre : chercher `L'avantage table` dans
   `index.html` et supprimer le bloc `carte-public__bonus`. Une promesse tarifaire non
   tenue coûte plus cher en avis négatifs qu'elle ne rapporte en visites.
2. 🟡 **La carte à la carte affichée est-elle toujours d'actualité ?**
   Relevée sur Tripadvisor le 13/08/2026. Le menu à 26 €, lui, est confirmé.
5. 🟡 **Le restaurant prend-il les groupes et les privatisations ?** Le parc, oui
   (CSE, groupes, événements). Pour le restaurant seul, rien. Potentiel commercial réel.
6. 🟡 **Le portail privatif est-il ouvert en permanence pendant le service ?**
7. 🟡 **Y a-t-il des balançoires ?** (mentionnées dans votre brief, introuvables ailleurs)
8. 🟡 **Coordonnées GPS exactes du portail privatif du restaurant**, pour un guidage juste.
9. 🟡 **Y a-t-il un menu enfant ?** Rien nulle part, alors que la cible famille est centrale.

---

## 8. Sources : ce qui a répondu, ce qui a résisté

| Source | Résultat |
|---|---|
| `croc-parc.re` (accueil + restauration) | ✅ Très riche — horaires, accès, équipements, avis |
| Fiche Tripadvisor du restaurant | ✅ Menu avec prix, services, e-mail, horaires · ⚠️ 0 avis, GPS erroné |
| Pages Jaunes, Petit Futé, guide-reunion.fr | ✅ Confirmations croisées |
| sudreuniontourisme.fr, letangsale.fr, ONF | ✅ Contexte forêt |
| **Facebook** (restaurant et parc) | ❌ Non supporté par l'outil d'extraction. **C'est la source de la carte de la semaine** — à exploiter manuellement |
| **Instagram** `@crocparc` | ❌ Même limitation |
| **Fiche Google Business** | ❌ Pas d'extraction directe ; les avis Google visibles proviennent du widget de croc-parc.re |
| Presse locale (Zinfos974, Clicanoo, Linfo.re) | ⭕ Aucun article trouvé sur le restaurant |
