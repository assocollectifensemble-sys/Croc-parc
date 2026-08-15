# Croc Parc Photos

Chaine de vente des photos de visite : Sony A7 IV -> FTP -> tri automatique par
carte QR -> stockage -> galerie web -> paiement.

Ce depot est construit par phases. **La phase A est livree** : le pont local
fonctionne de bout en bout, sans aucun compte cloud.

| Phase | Contenu | Etat |
|---|---|---|
| A | Pont local : surveillance FTP, cartes QR, previews filigranees, file SQLite | **livree** |
| B | R2 + D1 + `POST /api/ingest` | a venir |
| C | Galerie PWA | a venir |
| D | Stripe Checkout et telechargements | a venir |
| E | Admin, purge a 30 jours, webhook Make, planches de cartes | a venir |

```
crocparc-photos/
├── bridge/               # service Python installe sur le mini-PC du parc
│   ├── src/bridge/       # config, watcher, qr, imaging, queue, uploader, processor
│   ├── tests/            # pytest ; les JPEG de test sont generes par les tests
│   └── .env.example      # toutes les variables, commentees
└── tools/
    └── simulate-drop.py  # fabrique une fausse matinee de prise de vue
```

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

## Installation sur le mini-PC

Python 3.11 ou plus, et la bibliotheque systeme de zbar (pyzbar est un simple
liant vers elle).

```bash
# Debian / Ubuntu
sudo apt-get install -y python3-venv libzbar0
# Windows : rien a installer, la DLL est fournie avec pyzbar
# macOS : brew install zbar

cd bridge
python3 -m venv .venv
source .venv/bin/activate          # Windows : .venv\Scripts\activate
pip install -e ".[dev]"
```

## Configuration

Une seule source de verite : `bridge/.env`, lu par `config.py`. Aucune valeur
n'est codee en dur ailleurs dans le pont.

```bash
cp .env.example .env
$EDITOR .env
```

Seule `BRIDGE_INBOX_DIR` est obligatoire : le dossier ou le FTP depose les JPEG.
Tout le reste a une valeur par defaut raisonnable. Les variables deja presentes
dans l'environnement du systeme l'emportent sur le fichier, ce qui permet de
surcharger un reglage sans editer `.env`.

Les reglages les plus utiles :

| Variable | Defaut | Role |
|---|---|---|
| `BRIDGE_INBOX_DIR` | — | dossier surveille (cible du FTP) |
| `BRIDGE_DATA_DIR` | `./data` | file SQLite, archives, previews, journaux |
| `BRIDGE_STABLE_SECONDS` | `2.0` | duree sans changement de taille avant traitement |
| `PREVIEW_MAX_EDGE` / `PREVIEW_QUALITY` | `2048` / `82` | preview filigranee |
| `THUMB_MAX_EDGE` / `THUMB_QUALITY` | `512` / `75` | vignette |
| `WATERMARK_TEXT` / `WATERMARK_OPACITY` | `CROC PARC` / `0.5` | filigrane |
| `SESSION_TTL_DAYS` | `30` | duree de vie d'une session |
| `BRIDGE_TZ_OFFSET` | `+04:00` | La Reunion, pas d'heure d'ete |
| `BRIDGE_STORAGE_BACKEND` | `local` | `local` en phase A, `r2` en phase B |
| `BRIDGE_REGISTRAR_BACKEND` | `none` | `none` en phase A, `api` en phase B |
| `BRIDGE_HEALTH_PORT` | `8787` | compteurs de supervision |

## Utilisation

```bash
cd bridge
python -m bridge run      # service : surveille, traite, expose /health
python -m bridge once     # traite ce qui est en attente puis rend la main
python -m bridge status   # etat de la file et incidents du jour
python -m bridge retry    # remet en file les fichiers en quarantaine
```

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
data/out/crocparc-originals/AAAA-MM-JJ/<CODE>/DSCxxxxx.JPG    27 originaux
data/originals/AAAA-MM-JJ/<CODE>/                             archive locale
data/originals/cards/AAAA-MM-JJ/                              photos des cartes, hors ligne
```

Les 3 photos de cartes n'apparaissent nulle part dans la sortie publiable, et
les originaux sont identiques aux fichiers d'origine :

```bash
cd bridge/data
for f in out/crocparc-originals/*/*/*.JPG; do
  md5sum -c <<< "$(md5sum inbox/$(basename $f) | cut -d' ' -f1)  $f"
done
```

## Tests

```bash
cd bridge && python -m pytest -q
```

Aucun binaire n'est versionne : chaque test fabrique ses propres JPEG, cartes QR
comprises. Les tests couvrent notamment la detection de fichier stable, le JPEG
tronque, le redemarrage en cours de lot, la coupure reseau de quatre heures, les
photos arrivees avant toute carte, deux cartes consecutives et la carte arrivee
apres ses photos.

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

## Reglages du Sony A7 IV (memo)

Menu Reseau -> Transfert/Distant -> Fonct. transf. FTP : serveur FTP du mini-PC,
transfert automatique active, economie d'energie FTP activee, **cible JPEG
uniquement** (le RAW reste sur la carte). Point d'acces Wi-Fi dedie a la zone de
prise de vue, distinct du reseau public du parc.
