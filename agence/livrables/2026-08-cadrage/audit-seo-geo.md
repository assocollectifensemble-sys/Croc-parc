# Audit SEO / GEO — croc-parc.re
> Agent digital-growth — 26/08/2026. Pages examinées en direct : `https://croc-parc.re/` (accueil), `/les-gouters-danniversaire`, `/vos-evenements`, `/la-restauration`, `/robots.txt`, `/sitemap.xml`. Le domaine **sans tiret ne répond pas** : toujours communiquer `croc-parc.re`.

---

## 1. État des lieux

**Socle technique** (vérifié sur toutes les pages ci-dessus) : **WordPress + Elementor 3.32.5 + Yoast SEO + Site Kit by Google**, tout en **HTTPS** (200 OK). La boîte à outils est déjà en place — elle est juste **sous-exploitée**.

| Point | Constat | Verdict |
|---|---|---|
| **Title accueil** | « Accueil - Croc Parc » (vérifié sur `/`) — **aucun mot-clé** (parc animalier, crocodiles, La Réunion…) | 🔴 |
| **Meta description** | **Absente sur les 4 pages vérifiées** — Google/IA se rabattent sur un extrait tronqué « …Parce que […] » | 🔴 |
| **H1** | **Aucun H1 sur tout le site** : titres de pages en H2, hiérarchie cassée (H2 → H5 sur l'accueil) | 🔴 |
| **Schema.org** | Graphe Yoast générique (WebPage/WebSite/Organization) + **FAQPage sur l'accueil** (horaires + tarif 15 €) ✅ ; mais **pas de TouristAttraction**, pas d'adresse/geo/horaires structurés, **pas de Restaurant** sur `/la-restauration`, pas d'Event | 🟠 |
| **robots.txt** | Propre (Yoast, tout autorisé, sitemap déclaré) — vérifié sur `/robots.txt` | 🟢 |
| **Sitemap** | `sitemap_index.xml` Yoast, 3 sous-sitemaps, `page-sitemap` modifié **21/08/2026** → sitemap vivant | 🟢 |
| **Fraîcheur** | Accueil modifié **13/07/2026** (événements été à jour) ✅ ; mais pages **anniversaires** et **événements figées depuis déc. 2024** | 🟠 |
| **Vitesse perçue** | Accueil = **272 Ko de HTML seul**, ~**40 scripts + 40 CSS**, **12 images sur 17 sans lazy loading** → page lourde. Score Lighthouse/Core Web Vitals : [NON VÉRIFIABLE] (quota PageSpeed épuisé ce mois) | 🟠 |
| **Mobile** | Viewport responsive présent ; rendu réel sur téléphone [NON VÉRIFIABLE] | 🟠 |
| **Hygiène** | Page fantôme **`/teste` indexée** (contenu restaurant en doublon) ; sur `/vos-evenements`, email **orizon.reunion@wanadoo.fr** au lieu de contact@croc-parc.re → incohérence **NAP** | 🔴 |

**Bonne nouvelle** : rien n'est cassé (indexation ouverte, sitemap propre, FAQ structurée déjà là). Le site est **invisible par manque de contenu et de balises**, pas par problème technique — c'est le scénario le moins cher à corriger.

---

## 2. Quick wins (≤ 2 semaines) — dans l'ordre

Tout se fait **dans Yoast/Elementor déjà installés = 0 € d'abonnement**.

**1. Réécrire les titles + meta descriptions** (Yoast, ~1h) :
- Accueil — title : `Croc Parc — Parc animalier et botanique à l'Étang-Salé, La Réunion` ; meta : `Crocodiles, lémuriens, mini-ferme et jardin botanique sur 4,7 ha à l'Étang-Salé. Animations, anniversaires, restaurant. Ouvert mar-dim 10h-17h, 7j/7 pendant les vacances. Tarif unique 15 €.`
- Anniversaires — title : `Anniversaire enfant à La Réunion — goûters d'anniversaire à Croc Parc`
- Événements — title : `Lieu événementiel à La Réunion (Sud) — privatisation, séminaires, réceptions | Croc Parc`
- Restauration — title : `Restaurant Le Maï-Taï & snack — déjeuner à Croc Parc, Étang-Salé`

**2. Ajouter un H1 unique par page** (Elementor : passer le titre principal de H2 en H1) — accueil : `Parc animalier et botanique à l'Étang-Salé — Croc Parc`.

**3. Ajouter le JSON-LD TouristAttraction** (accueil, via Yoast ou un bloc HTML) :
```json
{
  "@context": "https://schema.org",
  "@type": "TouristAttraction",
  "name": "Croc Parc",
  "description": "Parc animalier (crocodiles du Nil, lémuriens, tortues, mini-ferme) et jardin botanique de 4,7 hectares à l'Étang-Salé, La Réunion. Animations quotidiennes, anniversaires, événements.",
  "url": "https://croc-parc.re/",
  "telephone": "+262 262 91 40 41",
  "email": "contact@croc-parc.re",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "1, route forestière",
    "addressLocality": "Étang-Salé",
    "postalCode": "97427",
    "addressCountry": "RE"
  },
  "openingHoursSpecification": [
    { "@type": "OpeningHoursSpecification",
      "dayOfWeek": ["Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"],
      "opens": "10:00", "closes": "17:00" }
  ],
  "specialOpeningHoursSpecification": "Ouvert 7j/7 de 10h à 17h pendant les vacances scolaires et jours fériés",
  "offers": { "@type": "Offer", "price": "15", "priceCurrency": "EUR",
    "description": "Tarif unique à partir de 3 ans" },
  "event": { "@type": "Event", "name": "Nourrissage des crocodiles",
    "description": "Nourrissage commenté des crocodiles, mercredi et dimanche à 16h",
    "eventSchedule": { "@type": "Schedule", "byDay": ["Wednesday","Sunday"], "startTime": "16:00" },
    "location": { "@type": "Place", "name": "Croc Parc, Étang-Salé" } },
  "sameAs": ["https://www.facebook.com/crocparc.reunion/", "https://www.instagram.com/crocparc/"]
}
```
*(le bloc **FAQPage** existant sur l'accueil est bon : l'enrichir d'une Q « Quand a lieu le nourrissage des crocodiles ? » → « Mercredi et dimanche à 16h »)*

**4. Nettoyer** : supprimer ou passer en noindex la page **`/teste`** ; remplacer **orizon.reunion@wanadoo.fr** par contact@croc-parc.re sur `/vos-evenements` (cohérence **NAP** = critère local + IA).

**5. Soumettre le sitemap à Bing Webmaster Tools** (`https://croc-parc.re/sitemap_index.xml`) — **ChatGPT s'appuie sur l'index Bing** ; import en 1 clic depuis Search Console. Gratuit, 15 min.

**6. Google Business Profile : 1 post/semaine** (photo animation + horaires du week-end + nourrissage mer/dim 16h) + **réponse à chaque avis**. Tâche déléguable à Florence (gabarit à fournir).

**7. Alléger l'accueil** : activer le lazy loading sur les 12 images restantes, compresser les visuels (Elementor > réglages images). Objectif visible sans outil : page < 150 Ko HTML.

**8. Rafraîchir les 2 pages business figées depuis 2024** (anniversaires, événements) : dates 2026-2027, photos récentes — la **fraîcheur < 30 jours** est un critère GEO.

---

## 3. Plan de blog GEO — 12 articles (sept. 2026 → août 2027)

Règle par article : la **question cible en H1/H2**, le **bloc-réponse 40-60 mots en tout premier paragraphe** (c'est lui que citent ChatGPT/Gemini/AI Overviews), puis photos, détails, FAQ. 1 article/mois, calé sur les saisons.

| Mois | Titre | Question cible (telle que posée) | Bloc-réponse prêt à l'emploi |
|---|---|---|---|
| **Sept. 2026** | Vacances d'octobre à La Réunion : le programme famille de Croc Parc | « que faire pendant les vacances d'octobre à La Réunion avec des enfants » | Pendant les vacances d'octobre (10-26/10), Croc Parc à l'Étang-Salé est ouvert 7j/7 de 10h à 17h : crocodiles, lémuriens, mini-ferme, jardin botanique, animations quotidiennes et nourrissage des crocodiles mercredi et dimanche à 16h. Tarif unique 15 €, gratuit avant 3 ans. |
| **Oct. 2026** | Arbre de Noël d'entreprise à La Réunion : pourquoi choisir un parc animalier | « où organiser un arbre de Noël d'entreprise à La Réunion » | Croc Parc accueille les arbres de Noël d'entreprises et CE sur 5 hectares à l'Étang-Salé : rencontre avec les animaux, animations pour enfants, restauration sur place et espaces privatisables. Formules adaptées à chaque budget, réservation au 0262 91 40 41 ou contact@croc-parc.re. |
| **Nov. 2026** | Fêter un anniversaire d'enfant à Croc Parc : goûter, animaux et souvenirs | « où fêter un anniversaire enfant à La Réunion » | Croc Parc (Étang-Salé) organise des goûters d'anniversaire au milieu des crocodiles, lémuriens et animaux de la mini-ferme : formule goûter + accès au parc et à ses jeux, en journée ou demi-journée, du mardi au dimanche. Réservation simple par téléphone au 0262 91 40 41. |
| **Déc. 2026** | Été austral : 10 idées de sorties famille autour de l'Étang-Salé | « que faire en famille à La Réunion pendant les grandes vacances » | De mi-décembre à fin janvier, Croc Parc est ouvert tous les jours de 10h à 17h : parc animalier et botanique ombragé de 4,7 ha dans la forêt de l'Étang-Salé, animations quotidiennes, mini-golf et aires de jeux. Une journée complète en famille pour 15 € par personne. |
| **Janv. 2027** | Il pleut à La Réunion : que faire avec les enfants ? | « que faire en famille à La Réunion quand il pleut » | Même par temps couvert, Croc Parc reste une bonne sortie : les allées ombragées de la forêt d'Étang-Salé (côté sous le vent, l'un des plus secs de l'île), les kiosques couverts et le restaurant permettent de profiter des animaux entre deux averses. Ouvert dès 10h, tarif unique 15 €. |
| **Févr. 2027** | Sortie scolaire à Croc Parc : ateliers pédagogiques crocodiles et botanique | « idée de sortie scolaire à La Réunion » | Croc Parc propose aux écoles des ateliers pédagogiques de 30 à 45 minutes (25 élèves max par groupe) autour des crocodiles, des espèces endémiques et du jardin botanique, à l'Étang-Salé. Dossier enseignant, kiosques pique-nique et accès facilité aux bus. Devis au 0262 91 40 41. |
| **Mars 2027** | Séminaire et journée de cohésion dans le Sud : l'option nature | « lieu pour séminaire ou team building dans le sud de La Réunion » | À 5 minutes de la route des Tamarins, Croc Parc privatise ses espaces pour séminaires, journées de cohésion et réceptions : 5 hectares de nature, salles et kiosques, activités originales (nourrissage, visite botanique) et restauration sur place. Formules sur devis, jauge jusqu'à 614 personnes. |
| **Avr. 2027** | Où voir des crocodiles à La Réunion ? | « où voir des crocodiles à La Réunion » | Croc Parc, à l'Étang-Salé, est le seul parc de La Réunion où observer des crocodiles du Nil, aux côtés de lémuriens, tortues étoilées, iguanes et paons. Nourrissage commenté mercredi et dimanche à 16h. Ouvert du mardi au dimanche 10h-17h, 7j/7 pendant les vacances. |
| **Mai 2027** | Que faire à l'Étang-Salé : forêt, plage noire… et crocodiles | « que faire à l'Étang-Salé la Réunion » | À l'Étang-Salé, entre la plage de sable noir et la forêt domaniale, Croc Parc complète la journée : parc animalier et botanique de 4,7 ha, aires de jeux, mini-golf et restaurant Le Maï-Taï. Une étape famille à 5 minutes de la quatre-voies, pour 15 € par personne. |
| **Juin 2027** | Sortie gramoun : accueillir clubs de seniors et associations | « idée de sortie pour un club de seniors à La Réunion » | Croc Parc accueille les clubs de 3e âge et CCAS en semaine : visite ombragée à plat, jardin botanique, animations adaptées et déjeuner au restaurant Le Maï-Taï. Formules groupe tout compris sur devis, parking bus sur place. Contact : 0262 91 40 41. |
| **Juil. 2027** | Vacances d'hiver austral : une journée complète à Croc Parc | « sortie pas chère en famille à La Réunion » | Pour 15 € par personne (gratuit avant 3 ans), Croc Parc offre une journée entière : 4,7 ha d'animaux et de jardins, animations quotidiennes des vacances, aires de jeux, mini-golf et pique-nique autorisé sous les kiosques. Ouvert 7j/7 pendant les vacances scolaires, 10h-17h. |
| **Août 2027** | Un lieu de réception atypique à La Réunion : se marier ou recevoir au milieu des animaux | « lieu de réception original mariage La Réunion » | Croc Parc privatise son écrin de verdure de 5 hectares à l'Étang-Salé pour mariages de jour, baptêmes et grandes réceptions : cérémonie au milieu des filaos, animaux, scène et restauration. Privatisation totale ou partielle, sur devis au 0262 91 40 41. |

**Règles d'exécution** : NAP identique partout ; 1 photo originale minimum (les IA valorisent les données originales) ; FAQ 3 questions en bas d'article (balisée FAQPage) ; relire les chiffres avant publication (règle agence : aucun chiffre inventé — les jauges/tarifs groupes sont à confirmer avec Babeth avant mise en ligne).

---

## 4. Mesure — 3 indicateurs, 10 min/mois

1. **Google Search Console** (à connecter si pas fait — Site Kit est déjà installé) : **clics + impressions** sur les requêtes hors marque (« anniversaire enfant réunion », « parc animalier réunion »…). Objectif : croissance mensuelle après chaque article.
2. **Google Business Profile — statistiques** : vues de la fiche, **demandes d'itinéraire** et appels. Objectif : corréler avec le rythme 1 post/semaine.
3. **Mentions IA (test manuel mensuel)** : poser les 5 mêmes questions à ChatGPT, Gemini et Google AI Overviews (« que faire en famille à La Réunion », « où fêter un anniversaire enfant à La Réunion », « lieu séminaire sud Réunion », « où voir des crocodiles à La Réunion », « que faire à l'Étang-Salé ») et noter dans un tableau : **Croc Parc cité oui/non + position**. C'est le vrai KPI GEO.

---
*Sources : relevés directs des 26/08/2026 sur croc-parc.re (HTML brut, robots.txt, sitemap) ; méthode GEO : `agence/references/2026-08-25-etude-technique-digital.md` §4. Score PageSpeed : à mesurer en septembre (quota mensuel de l'outil épuisé).*
