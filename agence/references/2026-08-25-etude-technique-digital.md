# Étude technique & digital — solaire, billetterie, newsletter/RGPD, SEO/GEO, sonorisation
> Recherches web du 25/08/2026 (agent veille-marche). Chaque fait est sourcé (URL + date) ; [NON TROUVÉ] = non vérifié, ne pas utiliser sans confirmation.

## 1. Photovoltaïque à La Réunion (projet ~20-25 kWc, 100-120 m²)
- Cadre : **arrêté du 5/01/2024 « S24 ZNI »** — bâtiment, hangar ou **ombrière** ≤ 500 kWc. ([Légifrance](https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000048961100), 01/2024)
- ≤ 100 kWc en ZNI : **autoconsommation avec vente du surplus = prime à l'investissement + tarif d'achat du surplus** → le projet Croc Parc est **éligible à la prime EDF SEI** (versée ~12 mois après mise en service). ([CRE](https://www.cre.fr/actualites/toute-lactualite/la-cre-publie-les-tarifs-et-primes-relatifs-aux-installations-photovoltaiques-implantees-sur-batiment-hangar-ou-ombriere-d-une-puissance-crete-i.html))
- **L'ombrière PV est explicitement éligible** au même régime → une ombrière au-dessus des gonflables = ombre + production (2-en-1).
- Surplus quasi non rémunéré (**~1,1 c€/kWh depuis 06/2026**, à confirmer sur l'open data CRE) → **dimensionner sur l'autoconsommation du pic 11h-14h** : la logique du projet est la bonne. ([France Rénov'Habitat](https://france-renovhabitat.re/prime-autoconsommation-reunion-2026-kap-photovoltaique-et-aides/))
- [NON TROUVÉ] Montant exact de la prime (€/Wc) tranches 9-36 / 36-100 kWc au trimestre courant — révisé trimestriellement, à demander à l'installateur ou sur l'Open Data CRE.
- **Pas de défiscalisation** : le PV est exclu du crédit d'impôt outre-mer (244 quater W) et du Girardin depuis 2011. KAP Photovoltaïque Région = particuliers uniquement ; pour les entreprises → guichet **« La Réunion ÉcoPositive »** (Région + UE) à solliciter. ([Région Réunion](https://www.regionreunion.com/aides-services/article/guichet-la-reunion-ecopositive))
- Prix constatés Réunion (résidentiel) : **~2 000-3 000 €/kWc** en toiture → extrapolation 20-25 kWc : **~35-55 k€** (budget 20-40 k€ tendu mais atteignable en bas de fourchette, hors batterie, après prime).
- **Ombrière** (prix métropole) : **250-600 €/m²** tout compris → 100-120 m² ≈ **30-70 k€** (surcoût cyclonique Réunion [NON TROUVÉ]). Plus cher que la toiture mais double service.
- Installateurs locaux à consulter (vérifier RGE QualiPV) : **Sunzil, Alclima, Ecosun, Ixeo**, France Rénov'Habitat, Gaia, Solarmax, Electroconcept OI.
- Délais bout en bout (étude + urbanisme + raccordement EDF SEI + Consuel) : **~3-6 mois**. La demande de raccordement vaut demande de contrat d'achat.

## 2. Billetterie en ligne (petit parc)
| Solution | Coût (2025-2026) | Notes |
|---|---|---|
| **Billetweb** | **0,29 € + 1 %/billet** en ligne, 0 au guichet | Commission la plus basse du marché FR ; app scan pro ; formulaires acheteur |
| **Weezevent** | **0,99 €/billet < 40 €** ; 2,5 % au-delà | Offre « parcs & tourisme » : caisse + contrôle d'accès + CRM WeezTarget |
| Yurplan | 0,39 € + 1 % HT | FR |
| HelloAsso | 0 % (pourboire) | **Associations loi 1901 uniquement** |
| Regiondo | 0-199 €/mois + ~3,5 % + 0,20 € | Cher ; utile seulement pour distribution OTA (GetYourGuide…) |
| Bokun (Tripadvisor) | 0-499 $/mois + 1-1,5 % | OTA Viator ; données hors UE à vérifier |
- Recommandation de l'étude : **Billetweb** (coût minimal) ou **Weezevent** (si on veut caisse+CRM intégrés) ; Regiondo/Bokun seulement si stratégie OTA touristes.
- RGPD : l'organisateur reste responsable de traitement ; **opt-in newsletter distinct et non pré-coché** à la commande.

## 3. Newsletter / CRM + RGPD jeu-concours
- **Brevo** (FR, données UE) : gratuit 300 emails/jour, **contacts illimités**, payant au volume (~7-9 €/mois pour 5 000 emails). **Choix naturel TPE française.**
- Mailchimp : gratuit réduit à 250 contacts (02/2026), US. MailerLite : gratuit réduit à 250 abonnés (07/2026).
- **Jeu-concours (roue + QR code)** — règles CNIL :
  - **2 cases distinctes** : règlement du jeu ≠ opt-in newsletter (facultatif, non pré-coché) ;
  - la participation **ne peut pas être conditionnée** au consentement marketing ;
  - information complète à la collecte, registre des traitements, désinscription dans chaque email, conservation ~3 ans après dernier contact.
- **Base Orizon Réunion** ⚠️ : société sœur = **responsable de traitement distinct**. Croc Parc ne peut emailer cette base **que si** les contacts avaient consenti à recevoir la prospection de partenaires (preuve à conserver). Sinon, voie licite : **Orizon envoie elle-même** un message présentant Croc Parc avec lien d'inscription volontaire à notre newsletter. ([CNIL](https://www.cnil.fr/fr/la-prospection-b-to-c-quelles-regles-pour-transmettre-des-donnees-des-partenaires))

## 4. SEO / GEO 2026
- GEO = être **cité** dans les réponses IA : blocs-réponses **40-60 mots** en haut de page, format Q&R, données originales, sources, **fraîcheur** (<30 jours).
- **Schema.org** : LocalBusiness/**TouristAttraction**, Event, FAQPage, OpeningHoursSpecification. Cohérence NAP partout.
- **Soumettre le sitemap à Bing Webmaster Tools** (ChatGPT s'appuie sur l'index Bing).
- **llms.txt : non supporté par Google**, aucun effet mesuré — 20 min max, pas une stratégie.
- Citations locales décisives pour un lieu touristique : **Google Business Profile** (poster 1×/sem., répondre aux avis), Tripadvisor, IRT, Wikipédia/Wikidata, presse locale.

## 5. Sonorisation parc extérieur (2-4 ha) + obligations ERP type PA
- Technologie de référence : **ligne 100 V multi-zones** (HP chaînés sur grandes longueurs, volume par enceinte, zones par ampli). Bluetooth/Sonos : inadapté en extérieur grande surface.
- Ordres de prix matériel : ampli multizone ~1 000 €, enceintes IP66 ~100-300 €/pièce → **quelques milliers à 10-15 k€** selon zones (pose/tranchées en sus). À chiffrer localement.
- **ERP type PA** (plein air, arrêté 25/06/1980, PA 1-14) : public > 300 pers. ; cat. 2 = 701-1 500, cat. 3 = 301-700.
- Pas de SSI normalisé exigé en type PA, mais **une alarme d'évacuation audible partout est exigée** → **la sonorisation générale du parc est le moyen usuel de s'y conformer** (signal dédié distinct de la musique, micro prioritaire à l'accueil, personnel formé). [À VÉRIFIER : texte exact art. PA 13]
- Le projet « sonorisation + alerte d'urgence » du compte-rendu répond donc à **une exigence réglementaire**, pas seulement au confort — argument fort pour prioriser.
- Penser **SACEM/SPRÉ** (diffusion musicale) [barème parc NON TROUVÉ].
