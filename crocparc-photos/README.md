# Croc Parc Photos

Chaine de vente des photos de visite : Sony A7 IV -> FTP -> tri automatique par
carte QR -> stockage -> galerie web -> paiement.

**La chaine est complete** : la photographe photographie une carte, puis le
groupe ; les photos partent en FTP, le pont les trie, fabrique les previews
filigranees, les depose sur R2 et declare la session dans D1 ; le visiteur saisit
son code, choisit ses photos, paie, et telecharge ses originaux. Rien n'exige de
compte cloud pour etre teste en local.

| Phase | Contenu | Etat |
|---|---|---|
| A | Pont local : surveillance FTP, cartes QR, previews filigranees, file SQLite | **livree** |
| B | R2 + D1 + `POST /api/ingest` + `POST /fetch-original` | **livree** |
| C | Galerie PWA : saisie du code, grille, visionneuse, selection | **livree** |
| D | Stripe Checkout, webhook, page de retour, telechargements | **livree** |
| E | Console d'admin, purge a 30 jours, webhook Make, planches de cartes | **livree** |

```
crocparc-photos/
├── bridge/                     # service Python installe sur le mini-PC du parc
│   ├── src/bridge/             # config, watcher, qr, imaging, queue, uploader,
│   │                           # processor, signing, fetch_original, health
│   ├── tests/                  # pytest ; les JPEG de test sont generes par les tests
│   └── .env.example            # toutes les variables, commentees
├── functions/                  # Cloudflare Pages Functions (TypeScript)
│   ├── _lib/                   # signature HMAC, tarifs, Stripe, Make, admin
│   ├── api/ingest.ts           # le pont declare une session
│   ├── api/gallery/[code].ts   # la galerie d'un visiteur
│   ├── api/checkout.ts         # creation du paiement
│   ├── api/webhook/stripe.ts   # confirmation du paiement
│   ├── api/download/[token].ts # telechargement des originaux
│   ├── api/admin/overview.ts   # tableau de bord
│   ├── g/[code].ts             # sert la galerie sur l'URL du QR
│   └── __tests__/              # vitest, sur le SQL reel des migrations
├── workers/purge/              # Worker planifie : efface tout a 30 jours
├── db/migrations/              # schema D1
├── web/                        # PWA : saisie, galerie, remerciement, console
└── tools/
    ├── simulate-drop.py        # fabrique une fausse matinee de prise de vue
    └── generate-cards.py       # planches de cartes QR imprimables (PDF + CSV)
```

## Ou vivent les fichiers

C'est le point qui structure tout le reste. Un JPEG du A7 IV pese 10 a 20 Mo :
monter chaque original sur R2 viderait le palier gratuit en deux jours.

| Fichier | Taille | Ou il vit |
|---|---|---|
| Preview filigranee 2048 px | ~600 Ko | R2, bucket public `crocparc-previews` |
| Vignette filigranee 512 px | ~80 Ko | R2, meme bucket |
| Original pleine resolution | 10-20 Mo | **au parc**, dans `ORIGINALS_DIR` |

L'original ne quitte le parc que vendu : apres paiement, le webhook Stripe
appelle `POST /fetch-original` sur le pont, qui pousse alors ce fichier precis
dans le bucket prive. Effet de bord appreciable : tant que personne n'a paye,
aucune photo pleine resolution n'existe hors du parc.

## Le pont, en deux minutes

Le boitier envoie ses JPEG en FTP dans un dossier surveille. Le pont :

1. **attend que le fichier soit stable** (taille inchangee pendant 2 secondes) —
   sans ca, on traite des JPEG tronques ;
2. **lit le QR** sur une version reduite en niveaux de gris. QR valide = carte
   separatrice : une nouvelle session s'ouvre et **la photo de la carte n'est
   jamais publiee** ;
3. **rattache** chaque photo a la derniere carte photographiee avant elle ;
4. **fabrique** une preview filigranee (bord long 2048, qualite 82) et une
   vignette (512, qualite 75), sans aucun EXIF donc sans GPS ;
5. **archive** l'original tel quel dans `originals/AAAA-MM-JJ/<CODE>/`, copie
   verifiee par empreinte ;
6. **depose** le tout sur le stockage objet, puis **declare** la session.

Chaque fichier avance dans une machine a etats persistee en SQLite :

```
discovered -> stable -> analyzed -> processed -> uploaded -> registered -> done
```

Rien n'est garde en memoire. Un redemarrage reprend exactement ou la file en
etait ; une coupure reseau de quatre heures se rattrape toute seule, avec un
backoff exponentiel plafonne a 5 minutes.

## Installation sur le mini-PC (Windows)

Le pont tourne sur Windows, a cote de FileZilla Server. Python 3.11 ou plus
suffit : la DLL de zbar est fournie avec pyzbar, il n'y a rien d'autre a
installer.

```bat
cd bridge
python -m venv .venv
.venv\Scripts\activate
pip install -e ".[dev,cloud]"
```

Sous Linux ou macOS (developpement), zbar doit etre installe a part :

```bash
sudo apt-get install -y python3-venv libzbar0   # Debian / Ubuntu
brew install zbar                                # macOS
```

### FileZilla Server

Creer un utilisateur dedie a l'appareil photo, dont le dossier racine est
`C:\crocparc\ftp-in`, avec les droits d'ecriture uniquement. Le pont surveille
ce dossier **et ses sous-dossiers** : le boitier peut y creer une arborescence
par date sans que rien ne soit a changer.

### Demarrage automatique

Le pont doit repartir apres un redemarrage de Windows, sans personne pour
cliquer. Deux solutions, dans l'ordre de preference :

**NSSM** (vrai service Windows, redemarre en cas de plantage) :

```bat
nssm install CrocParcBridge C:\crocparc\bridge\.venv\Scripts\python.exe "-m bridge run"
nssm set CrocParcBridge AppDirectory C:\crocparc\bridge
nssm set CrocParcBridge AppStdout C:\crocparc\logs\service.log
nssm set CrocParcBridge AppStderr C:\crocparc\logs\service.log
nssm set CrocParcBridge Start SERVICE_AUTO_START
nssm start CrocParcBridge
```

**Tache planifiee** (sans logiciel supplementaire) : Planificateur de taches,
nouvelle tache, declencheur « Au demarrage de l'ordinateur », action
`C:\crocparc\bridge\.venv\Scripts\python.exe` avec les arguments `-m bridge run`
et le dossier de depart `C:\crocparc\bridge`. Cocher « Executer meme si
l'utilisateur n'est pas connecte » et, dans l'onglet Parametres, « Redemarrer en
cas d'echec toutes les 1 minute ».

Dans les deux cas, verifier apres un redemarrage :

```bat
curl http://localhost:8787/health
```

## Configuration

Une seule source de verite : `bridge/.env`, lu par `config.py`. Aucune valeur
n'est codee en dur ailleurs dans le pont.

```bash
cp .env.example .env
$EDITOR .env
```

Seule `WATCH_DIR` est obligatoire : le dossier ou le FTP depose les JPEG.
Tout le reste a une valeur par defaut raisonnable. Les variables deja presentes
dans l'environnement du systeme l'emportent sur le fichier, ce qui permet de
surcharger un reglage sans editer `.env`.

Les reglages les plus utiles :

| Variable | Defaut | Role |
|---|---|---|
| `WATCH_DIR` | — | dossier surveille, cible du FTP (`C:/crocparc/ftp-in`) |
| `ORIGINALS_DIR` | `./data/originals` | archive des originaux pleine resolution |
| `BRIDGE_DATA_DIR` | `./data` | file SQLite, archives, previews, journaux |
| `BRIDGE_STABLE_SECONDS` | `2.0` | duree sans changement de taille avant traitement |
| `PREVIEW_MAX_EDGE` / `PREVIEW_QUALITY` | `2048` / `82` | preview filigranee |
| `THUMB_MAX_EDGE` / `THUMB_QUALITY` | `512` / `75` | vignette |
| `WATERMARK_TEXT` / `WATERMARK_OPACITY` | `CROC PARC` / `0.65` | texte et opacite du filigrane |
| `WATERMARK_SCALE` / `WATERMARK_SPACING` | `0.06` / `0.85` | taille du texte (fraction du bord court) et densite du maillage |
| `WATCH_RETENTION_DAYS` | `15` | effacement des originaux de l'inbox une fois archives (0 = jamais) |
| `SESSION_TTL_DAYS` | `30` | duree de vie d'une session |
| `BRIDGE_TZ_OFFSET` | `+04:00` | La Reunion, pas d'heure d'ete |
| `BRIDGE_STORAGE_BACKEND` | `local` | `local` en phase A, `r2` en phase B |
| `BRIDGE_REGISTRAR_BACKEND` | `none` | `none` en phase A, `api` en phase B |
| `BRIDGE_HEALTH_PORT` | `8787` | compteurs de supervision |
| `BRIDGE_SHARED_SECRET` | — | secret HMAC partage avec les Functions (32 car. min) |
| `BRIDGE_INGEST_URL` | — | URL de `POST /api/ingest` |
| `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` | — | identifiants R2 |
| `BRIDGE_FETCH_PORT` | `8788` | port de `POST /fetch-original` |

Le pont refuse de demarrer si `BRIDGE_STORAGE_BACKEND=r2` sans identifiants R2,
si `BRIDGE_REGISTRAR_BACKEND=api` sans URL ni secret, ou si le secret fait moins
de 32 caracteres. Mieux vaut un refus au demarrage qu'une session perdue.

## Utilisation

```bash
cd bridge
python -m bridge run      # service : surveille, traite, expose /health
python -m bridge once     # traite ce qui est en attente puis rend la main
python -m bridge status   # etat de la file et incidents du jour
python -m bridge retry    # remet en file les fichiers en quarantaine
python -m bridge purge    # efface de l'inbox les originaux deja archives
```

`purge` tourne aussi toute seule dans `run`, une fois par heure. Elle n'efface
un fichier de l'inbox que si son archive locale existe **et** que son empreinte
correspond a celle enregistree au traitement ; au moindre doute, le fichier
reste et l'incident est journalise. L'archive locale
(`data/originals/`), elle, n'est jamais purgee par le pont : c'est la copie de
secours des originaux.

Supervision :

```bash
curl http://localhost:8787/health
{"status":"ok","pending":0,"done":30,"failed":0,
 "sessions_today":3,"photos_today":27,"qr_failures_today":0}
```

Le port de sante sert aussi de verrou d'instance unique : un second pont sur la
meme machine refuse de demarrer plutot que de traiter chaque photo deux fois.

Les journaux sont en JSON, une ligne par evenement, avec rotation
(`data/logs/bridge.log`, 5 Mo x 5).

### Demarrage automatique (systemd)

```ini
# /etc/systemd/system/crocparc-bridge.service
[Unit]
Description=Pont Croc Parc Photos
After=network.target

[Service]
Type=simple
User=crocparc
WorkingDirectory=/opt/crocparc-photos/bridge
ExecStart=/opt/crocparc-photos/bridge/.venv/bin/python -m bridge run
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

`Restart=always` est sans danger : la reprise apres coupure est testee, aucun
doublon n'est cree.

## Mise en ligne

```bash
npx wrangler login          # une fois, ouvre le navigateur
./tools/mise-en-ligne.sh
```

Le script cree le projet Pages, la base D1, les deux buckets R2, applique le
schema, genere et pose les secrets, deploie le site et le Worker de purge. Il
est rejouable et s'arrete a la premiere erreur.

**[docs/MISE-EN-LIGNE.md](docs/MISE-EN-LIGNE.md)** donne la marche complete,
dans l'ordre : Cloudflare, Stripe, le pont et son tunnel, Make, les cartes, et
la repetition generale a faire avant d'ouvrir au public.

**[docs/REPRISE-EN-LOCAL.md](docs/REPRISE-EN-LOCAL.md)** sert a reprendre le
projet sur une machine disposant des acces Cloudflare et Stripe : etat des
lieux, identifiants deja crees, et ce qui n'a jamais pu etre verifie a distance.

**[CLAUDE.md](CLAUDE.md)** liste les invariants du projet — les regles ecrites
en reponse a un defaut reel, qu'il ne faut pas « simplifier ».

### Developpement local

`wrangler` fait tourner les Functions dans le vrai moteur Cloudflare, avec une
base D1 locale. Aucun compte n'est necessaire.

```bash
npx wrangler d1 migrations apply crocparc-photos --local
echo "BRIDGE_SHARED_SECRET=un-secret-de-developpement-de-32-caracteres" > .dev.vars
npx wrangler pages dev --port 8976
```

Le pont peut alors viser cette instance :

```bash
cd bridge
WATCH_DIR=./data/inbox \
BRIDGE_REGISTRAR_BACKEND=api \
BRIDGE_INGEST_URL=http://localhost:8976/api/ingest \
BRIDGE_SHARED_SECRET=un-secret-de-developpement-de-32-caracteres \
python -m bridge once
```

### Le Worker de purge

Ce que la page d'accueil promet -- « vos photos sont effacees au bout de
30 jours » -- n'est vrai que parce qu'un Worker planifie l'execute. Il est
separe des Functions, car Cloudflare Pages ne declenche pas de taches planifiees.

```bash
npm run purge:deploy          # deploie le Worker et son declencheur quotidien
npm run purge:test            # le declenche a la main, en local
```

Il tourne tous les jours a 03h00 UTC, soit 07h00 a La Reunion. Il efface les
objets R2 **avant** les lignes en base : si le Worker s'arrete au milieu, il
reste des lignes pointant vers des objets disparus (galerie vide, sans danger)
plutot que des photos d'enfants publiques dont plus rien ne garde la trace.

### La console d'administration

`/admin.html`, protegee par `ADMIN_TOKEN`. Elle montre les visites du jour, les
**photos sans carte** (le seul endroit ou l'on s'apercoit qu'un QR n'a pas ete
lu), les ventes et les recettes. Le jeton reste en memoire d'onglet et
disparait a la fermeture.

### Les cartes a imprimer

```bash
python3 tools/generate-cards.py --nombre 300 --sortie cartes/
```

Produit un PDF de planches A4 (8 cartes par page, decoupe a 90 x 65 mm) et un
CSV `code,card_number`. Relancer la commande complete l'inventaire sans jamais
reutiliser un code deja tire. Les codes sont tires avec `secrets`, pas avec
`random` : ils sont la seule chose qui protege une galerie.

### Exposer `/fetch-original`

Le webhook Stripe doit pouvoir joindre le mini-PC pour reclamer un original
vendu. Plutot qu'ouvrir un port sur le routeur du parc, un tunnel Cloudflare
sort du reseau vers Cloudflare, sans adresse IP publique ni redirection :

```bash
cloudflared tunnel create crocparc-bridge
cloudflared tunnel route dns crocparc-bridge pont.crocparc.re
# config.yml : service http://127.0.0.1:8788
cloudflared service install     # demarrage automatique avec Windows
```

L'endpoint reste authentifie par HMAC : le tunnel ne remplace pas la signature,
il evite seulement d'exposer la machine.

### Securite du contrat

- `POST /api/ingest` et `POST /fetch-original` partagent le meme secret et le
  meme schema : on signe `horodatage.corps_brut`, jamais le corps seul. Sans
  cela, l'horodatage pourrait etre remplace sans invalider la signature et la
  fenetre de 5 minutes ne protegerait plus de rien.
- La comparaison des signatures passe par `crypto.subtle.verify` cote Function
  et `hmac.compare_digest` cote pont : a temps constant des deux cotes.
- `/fetch-original` n'accepte que des chemins relatifs, refuse `..`, les chemins
  absolus, les lettres de lecteur et les liens symboliques qui sortiraient de
  `ORIGINALS_DIR`.
- Les deux implementations de la signature sont verrouillees par un vecteur de
  test commun, present dans `bridge/tests/test_signing.py` et
  `functions/__tests__/signing.test.ts`. Si l'une devie, un des deux tests tombe.

## Le parcours du visiteur

1. Il scanne le QR de sa carte, ou saisit son code sur `photos.crocparc.re`.
   Le QR mene a `/g/K7M2QP` : l'URL reste lisible et partageable.
2. La galerie affiche ses vignettes filigranees. Il agrandit, il selectionne.
3. Il paie par Stripe Checkout. **Le prix est toujours recalcule cote serveur**
   a partir des photos reellement en base : un navigateur bricole ne peut pas
   se faire un tarif.
4. Stripe confirme, le webhook passe la commande en `paid`, cree le jeton de
   telechargement, puis **reclame les originaux au pont**.
5. La page de retour propose les fichiers. Le meme lien part par courriel via
   Make.

Quelques garde-fous qui meritent d'etre connus :

- **Une carte remise en circulation trop tot est mise en quarantaine.** Les
  cartes sont physiques et repassent en circulation ; le visiteur ne dispose
  que de son code, donc deux galeries vivantes sous le meme code seraient
  indemelables. Le pont **refuse d'ouvrir la seconde session** : les photos de
  ce groupe partent en session orpheline, visibles en admin seulement, et une
  alerte `card_quarantine` est levee. Une vente perdue vaut mieux que les
  enfants d'une famille montres a une autre. Consequence pratique :
  **imprimez de quoi tenir plus de 30 jours de rotation.**
- **Les cles R2 des previews sont derivees d'un sel local**, pas du code ni du
  nom de fichier du boitier. Le bucket etant public, une cle du type
  `2026-10-15/K7M2QP/DSC01234_p.jpg` serait devinable -- et pour la session
  ORPHAN, dont le code est connu, enumerable sans meme avoir de carte.
- **Le forfait ne peut jamais couter plus cher que les photos a l'unite** : si
  la selection depasse le prix du pack, le pack est applique et le visiteur
  repart avec toute sa visite.
- **Le paiement survit a une panne du pont.** Si le mini-PC est eteint au moment
  de l'achat, la commande reste valide : le telechargement reclame les
  originaux a la demande, et le lien reste bon 30 jours.

## Rejouer le critere d'acceptation de la phase A

> On depose 30 JPEG dont 3 cartes dans le dossier surveille, et on obtient
> 3 sessions correctes avec previews filigranees, sans les photos de cartes.

```bash
cd crocparc-photos
python3 tools/simulate-drop.py --inbox bridge/data/inbox   # 3 cartes + 27 photos
cd bridge && python -m bridge once
```

Resultat attendu (verifie sur cette machine) :

```
data/out/crocparc-previews/AAAA-MM-JJ/<CODE>/DSCxxxxx_p.jpg   27 previews 2048 px
data/out/crocparc-previews/AAAA-MM-JJ/<CODE>/DSCxxxxx_t.jpg   27 vignettes 512 px
data/originals/AAAA-MM-JJ/<CODE>/DSCxxxxx.JPG                 27 originaux archives
data/originals/cards/AAAA-MM-JJ/                              photos des cartes, hors ligne
```

Les 3 photos de cartes n'apparaissent nulle part dans la sortie publiable, et
les originaux archives sont identiques aux fichiers d'origine :

```bash
cd bridge/data
for f in originals/*/*/*.JPG; do
  md5sum -c <<< "$(md5sum inbox/$(basename $f) | cut -d' ' -f1)  $f"
done
```

(Une photo qui portait des coordonnees GPS fait exception : son bloc de
metadonnees a ete reecrit, ses pixels sont inchanges. Le pont le signale par un
evenement `gps_removed` dans `python -m bridge status`.)

## Tests

```bash
cd bridge && python -m pytest -q     # le pont
npm test                             # Functions et Worker de purge
npm run typecheck                    # TypeScript
```

Aucun binaire n'est versionne : chaque test fabrique ses propres JPEG, cartes QR
comprises. Cote pont, les tests couvrent la detection de fichier stable, le JPEG
tronque, le redemarrage en cours de lot, la coupure reseau de quatre heures, les
photos arrivees avant toute carte, deux cartes consecutives, la carte arrivee
apres ses photos, la purge, le nettoyage GPS, le depot R2 (contre un vrai
serveur S3 simule) et le cloisonnement de `/fetch-original`.

Cote Functions, les tests s'executent contre le **SQL reel des migrations**,
adosse au SQLite natif de Node : idempotence de `/api/ingest`, refus des
signatures et des horodatages invalides, validation des codes et des chemins.

Ce que couvrent les tests des Functions : idempotence de `/api/ingest`, refus
des signatures et horodatages invalides, **absence d'oracle** sur la galerie (un
code inconnu, expire, orphelin ou mal forme rendent la meme reponse), la carte
ayant servi a deux visites, le prix recalcule cote serveur, l'idempotence du
webhook Stripe, la revocation des liens a 30 jours et l'acces a la console.

La verification finale se fait sur le vrai moteur Cloudflare, et dans un vrai
navigateur :

```bash
npx wrangler d1 migrations apply crocparc-photos --local
echo "BRIDGE_SHARED_SECRET=un-secret-de-developpement-de-32-caracteres" > .dev.vars
npx wrangler pages dev --port 8976 --binding PREVIEWS_BASE_URL=http://127.0.0.1:8977

# dans un second terminal : servir les previews fabriquees par le pont
cd bridge/data/out/crocparc-previews && python3 -m http.server 8977

# dans un troisieme : faire tourner la chaine
python3 tools/simulate-drop.py --inbox bridge/data/inbox --groupes 1 --photos 7
cd bridge && WATCH_DIR=./data/inbox BRIDGE_REGISTRAR_BACKEND=api \
  BRIDGE_INGEST_URL=http://localhost:8976/api/ingest \
  BRIDGE_SHARED_SECRET=un-secret-de-developpement-de-32-caracteres \
  python -m bridge once
```

Puis ouvrir `http://localhost:8976/g/<CODE>` : la galerie doit afficher les
vignettes filigranees.

## Choix a connaitre

- **Codes** : alphabet `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (ni I, ni O, ni 0,
  ni 1), 6 caracteres. Le code interne `ORPHAN` contient un `O` : aucune carte
  reelle ne peut le porter, la collision est donc impossible par construction.
- **Une session par couple (code, date)**. Une carte reutilisee le meme jour
  retombe sur la meme session ; reutilisee un autre jour, elle en ouvre une
  neuve sans toucher a l'ancienne.
- **Photos sans carte** : session `ORPHAN` du jour, `status = orphan`, destinee
  a l'admin uniquement. A ne jamais servir depuis la galerie publique.
- **Original intact** : copie octet pour octet, verifiee par empreinte des deux
  cotes. Le GPS n'est retire que des previews et vignettes ; s'il est present
  dans un original, c'est journalise (`gps_present`) et visible dans `status`.
- **Ordre d'arrivee** : le rattachement se fait sur `DateTimeOriginal`, pas sur
  l'ordre des fichiers. Si une carte arrive apres ses photos, celles-ci sont
  rerangees tant qu'elles ne sont pas encore declarees.
- **QR illisible** : si le QR d'une carte ne se decode pas du tout, la photo est
  traitee comme une photo ordinaire et rejoint la session precedente. C'est
  visible en admin par un nombre de photos anormal ; il n'existe pas de moyen
  fiable de deviner qu'une photo *voulait* etre une carte.
- **GPS** : le boitier n'a pas de puce GPS, mais appaire au telephone avec la
  synchronisation de position, chaque photo repart avec les coordonnees du lieu.
  Les previews n'embarquent aucune metadonnee ; l'original vendu est nettoye de
  ses coordonnees **sans etre recompresse** (seul le bloc EXIF est reecrit, les
  pixels sont bit a bit identiques).
- **Numero d'inventaire des cartes** : le QR n'encode que l'URL de galerie. Le
  numero a 4 chiffres imprime sur la carte peut etre resolu par un CSV
  `code,card_number` (`CARDS_INVENTORY_CSV`), ou voyager dans l'URL (`?n=427`).
  Les deux voies existent et aucune n'est obligatoire : le champ reste vide si
  la photographe n'en a pas l'usage.

## Questions terrain a trancher avec la photographe

- Le geste change : elle **photographie la carte** avant chaque groupe, au lieu
  de noter le numero de la premiere photo. Plus rapide, mais c'est une habitude
  a prendre.
- **Une carte par jour maximum.** Deux groupes servis avec la meme carte le meme
  jour partagent la meme galerie, et chacun voit les photos de l'autre. Le pont
  leve une alerte `card_reused`, mais il ne peut pas les separer : le code est
  le seul identifiant que le visiteur possede.
- A-t-elle besoin du **numero d'inventaire a 4 chiffres** sur les cartes pour
  suivre son stock, ou le code visible (`K7M2QP`) lui suffit-il ? Si le code
  suffit, on supprime le champ.

## Reglages du Sony A7 IV (memo)

Menu Reseau -> Transfert/Distant -> Fonct. transf. FTP : serveur FTP du mini-PC,
transfert automatique active, economie d'energie FTP activee, **cible JPEG
uniquement** (le RAW reste sur la carte). Point d'acces Wi-Fi dedie a la zone de
prise de vue, distinct du reseau public du parc.
