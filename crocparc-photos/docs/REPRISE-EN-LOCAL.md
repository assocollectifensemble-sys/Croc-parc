# Reprise en local — mise en ligne

Ce document sert a reprendre le projet dans une session Claude Code locale,
disposant des acces Cloudflare que la session distante n'avait pas.

## Ou on en est

- Branche : `claude/croc-parc-photos-gr5wkw`
- Cinq phases livrees, 236 tests verts, trois revues de code, 33 defauts corriges
- **Rien n'est deploye.** Aucune ressource Cloudflare n'existe encore.
- Le webhook Make existe deja (voir plus bas), mais son scenario n'est pas cree.

Ce qui a bloque a distance : `wrangler login` ouvre un navigateur, et il n'y
avait ni token Cloudflare ni cle Stripe dans l'environnement. Le bac a sable
bloquait aussi les appels sortants vers les hotes non listes.

## Preparer la machine

```bash
git clone <depot> && cd crocparc-photos
git checkout claude/croc-parc-photos-gr5wkw

# Front et Functions
npm install

# Pont
cd bridge
python3 -m venv .venv && source .venv/bin/activate   # Windows : .venv\Scripts\activate
pip install -e ".[dev,cloud,cards]"
cd ..
```

Sous Linux ou macOS, zbar doit etre installe a part (`apt-get install libzbar0`
ou `brew install zbar`). Sous Windows, la DLL est fournie avec pyzbar.

Puis, **avant toute chose**, confirmer que la base est saine :

```bash
cd bridge && python -m pytest -q     # 140 attendus
cd .. && npm test                    # 96 attendus
npm run typecheck
```

Si ces trois commandes passent, le code est dans l'etat ou il a ete laisse.

## Etape 0 — l'essai sans compte, a faire en premier

Avant de creer quoi que ce soit chez Cloudflare, on peut faire tourner toute la
chaine sur une seule machine, gratuitement :

```bash
./tools/essai-local.sh
```

Le script verifie que les ports sont libres, prepare une base locale, imprime
une planche de huit cartes dont les QR pointent sur cette machine, puis demarre
le pont, l'API et la galerie. Il affiche l'adresse a ouvrir depuis un telephone
connecte au meme wifi.

Ensuite : photographier une carte, puis deux ou trois sujets, copier les JPEG
de la carte memoire vers `essai/inbox/` (le FTP n'est pas necessaire pour un
essai), attendre une dizaine de secondes, et ouvrir la galerie.

Ce que l'essai couvre : la carte photographiee comme separateur, le tri par
session, les previews filigranees, la galerie sur telephone, la console
d'administration. Ce qu'il ne couvre pas : le paiement (il faut des cles
Stripe) et le tunnel.

C'est le meilleur moyen de valider le **geste de la photographe** et le
**reglage du filigrane** avant d'investir dans la mise en ligne. Verifie de
bout en bout sur cette machine : 4 fichiers deposes, 1 session, 3 photos
publiees, galerie servie.

## Etape 1 — Cloudflare

```bash
npx wrangler login
./tools/mise-en-ligne.sh
```

Le script cree le projet Pages, la base D1, les deux buckets R2, applique le
schema, genere et pose les secrets, deploie le site et le Worker de purge. Il
est rejouable et s'arrete a la premiere erreur.

Points de vigilance :

- Il ecrit `.secrets-mise-en-ligne` (ignore par git). Ce fichier contient
  `BRIDGE_SHARED_SECRET` : **le pont a besoin de la meme valeur, a l'identique**.
  Il sert aussi de sel aux cles de stockage — le perdre change toutes les cles
  et orpheline les objets deja deposes.
- Il reporte l'identifiant D1 dans **les deux** `wrangler.toml`. S'ils divergent,
  le cron de purge tourne chaque nuit contre une base vide en journalisant une
  purge reussie.
- Le bucket `crocparc-originals` doit rester **prive**.

Puis l'acces public aux previews :

```bash
npx wrangler r2 bucket dev-url enable crocparc-previews
```

Reporter l'URL obtenue dans `wrangler.toml` (`PREVIEWS_BASE_URL`) et relancer le
script. Sans elle, `/api/gallery` repond 500 — volontairement, plutot que de
servir une galerie aux images vides.

## Etape 2 — Stripe

En **mode test** pour commencer.

1. Developpeurs > Cles API : recuperer `sk_test_...`
2. Developpeurs > Webhooks > Ajouter un point de terminaison :
   - URL : `https://<domaine>/api/webhook/stripe`
   - Evenements : `checkout.session.completed` **et**
     `checkout.session.async_payment_succeeded`
3. Recuperer le secret `whsec_...`
4. Relancer `./tools/mise-en-ligne.sh`, qui demande les deux valeurs.

Le second evenement n'est pas facultatif : sans lui, un paiement par
prelevement ou virement ne serait jamais livre.

## Etape 3 — Make

Le webhook et sa structure de donnees existent deja dans le compte :

```
URL      https://hook.eu1.make.com/psq8emt5j3k9757ecyoi2j5tp95o19hu
hookId   3552822
equipe   2101054   (organisation 8296030)
structure de donnees  532110
```

Reste a :

1. Importer `make/scenario-vente-confirmee.json` (Make > Create a new scenario >
   ... > Import Blueprint).
2. **Choisir une connexion d'envoi.** Les deux connexions existantes du compte
   appartiennent a une autre activite (`info@yoga-doula.eu`) : en creer une pour
   `photos@crocparc.re`, sinon les clients recevront leurs photos depuis une
   adresse sans rapport.
3. Verifier l'adresse d'alerte du second module.
4. Activer le scenario.
5. Poser l'URL en **secret**, pas en variable :
   ```bash
   npx wrangler pages secret put MAKE_WEBHOOK_URL --project-name crocparc-photos
   ```
   Qui connait l'URL peut declencher de faux courriels de vente.

Cout : 3 operations par vente, sur un forfait Core de 10 000 par mois deja
partage avec 7 scenarios.

## Etape 4 — Le pont, sur le mini-PC

Voir `docs/MISE-EN-LIGNE.md` section 3 : `.env`, identifiants R2, service NSSM
ou tache planifiee, tunnel `cloudflared` vers `127.0.0.1:8788`.

Sans tunnel, la chaine fonctionne quand meme : les originaux sont reclames au
moment du telechargement et le client patiente un peu.

## Etape 5 — La repetition generale

C'est elle qui compte, plus qu'une quatrieme revue de code. Sept points, dans
l'ordre, avec de vraies photos :

1. photographier une carte, puis trois photos ;
2. `curl http://localhost:8787/health` : tout doit etre a `done`, rien en echec ;
3. la console d'admin montre la session et ses trois photos ;
4. scanner le QR avec un telephone : la galerie s'affiche ;
5. acheter avec la carte de test `4242 4242 4242 4242` ;
6. telecharger, **et ouvrir les fichiers** : ce sont les originaux, sans
   filigrane, pleine resolution ;
7. le courriel de Make est arrive.

Passer en cles `sk_live_` seulement apres.

## Ce qui n'a jamais pu etre verifie a distance

A regarder en priorite une fois en local :

- **Windows** : le verrou d'instance (`msvcrt.locking`), les fichiers tenus par
  FileZilla ou l'antivirus au moment de la purge, `os.path.normcase` sur un
  partage reseau.
- **R2 et D1 reels** : tout a ete teste contre un SQLite natif et un serveur S3
  simule. Le Worker de purge n'a jamais tourne contre un vrai bucket.
- **Stripe reel** : la retention des cles d'idempotence, l'ordre des rejeux de
  webhook, la presence effective de moyens de paiement a notification differee.
- **La lecture des QR sur de vraies photos de cartes** prises au A7 IV : flou,
  contre-jour, carte salie. Seules des cartes synthetiques ont ete lues.
- **Le filigrane sur un vrai portrait de famille.** Regle actuel : opacite 0.65,
  texte a 6 % du bord court, maillage a 0.85. C'est le premier reglage a
  valider, et il se change en une ligne dans `.env`.

## Deux questions restees ouvertes

- Le **numero d'inventaire a 4 chiffres** sur les cartes est-il utile a la
  photographe, ou le code visible lui suffit-il ? S'il ne sert pas, on supprime
  le champ. La question est formulee pour elle dans le README.
- Le **geste change** pour elle : photographier la carte au lieu de noter un
  numero. A valider avant d'imprimer 300 cartes.
