# Mise en ligne

Ordre a respecter : chaque etape depend de la precedente. Comptez une heure la
premiere fois, moins de dix minutes pour les fois suivantes.

Tout ce qui peut l'etre est automatise par `tools/mise-en-ligne.sh`. Le reste
demande un navigateur, et figure ci-dessous.

---

## 1. Cloudflare

```bash
npx wrangler login          # une fois, ouvre le navigateur
./tools/mise-en-ligne.sh
```

Le script cree le projet Pages, la base D1, les deux buckets R2, applique le
schema, genere et pose les secrets, deploie le site et le Worker de purge. Il
est **rejouable** : relancez-le apres chaque changement, il ne recree pas ce qui
existe et s'arrete a la premiere erreur.

Il ecrit `.secrets-mise-en-ligne` (ignore par git). Ce fichier contient le
secret partage avec le pont : **gardez-le**, le pont en a besoin a l'identique.

### Acces public aux previews

Le bucket des previews doit etre lisible par les navigateurs, et lui seul.

```bash
npx wrangler r2 bucket dev-url enable crocparc-previews
```

Reportez l'URL obtenue dans `wrangler.toml` (`PREVIEWS_BASE_URL`), puis
relancez le script. En production, preferez un domaine personnalise
(`previews.crocparc.re`) : l'URL `r2.dev` est bridee et ne doit pas servir de
domaine definitif.

**Le bucket `crocparc-originals` reste prive.** Il ne doit recevoir aucun acces
public : c'est lui qui contient les photos pleine resolution achetees.

---

## 2. Stripe

1. Tableau de bord Stripe, **en mode test** pour commencer.
2. Developpeurs > Cles API : copiez la cle secrete `sk_test_...`.
3. Developpeurs > Webhooks > Ajouter un point de terminaison :
   - URL : `https://photos.crocparc.re/api/webhook/stripe`
   - Evenements : `checkout.session.completed` **et**
     `checkout.session.async_payment_succeeded`
4. Copiez le secret de signature `whsec_...`.
5. Relancez `./tools/mise-en-ligne.sh` : il vous demandera les deux valeurs.

Le second evenement n'est pas facultatif : sans lui, un paiement par
prelevement ou virement ne serait jamais livre.

### Verification

Une commande de test avec la carte `4242 4242 4242 4242`, n'importe quelle date
future et n'importe quel cryptogramme. La commande doit passer en `paid` dans
la console d'admin, et la page de retour proposer les fichiers.

Passez en cles `sk_live_...` seulement une fois ce parcours verifie.

---

## 3. Le pont, sur le mini-PC du parc

```bat
cd C:\crocparc\bridge
copy .env.example .env
notepad .env
```

Les valeurs a renseigner :

```ini
WATCH_DIR=C:/crocparc/ftp-in
ORIGINALS_DIR=C:/crocparc/originals

BRIDGE_STORAGE_BACKEND=r2
BRIDGE_REGISTRAR_BACKEND=api
BRIDGE_INGEST_URL=https://photos.crocparc.re/api/ingest
BRIDGE_SHARED_SECRET=<la valeur de .secrets-mise-en-ligne, a l'identique>

R2_ENDPOINT=https://<identifiant_de_compte>.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=<jeton R2>
R2_SECRET_ACCESS_KEY=<jeton R2>
```

Les identifiants R2 se creent dans le tableau de bord Cloudflare, rubrique
**R2 > Manage API tokens**, avec la permission *Object Read & Write* limitee aux
deux buckets.

Puis l'installation en service (voir le README pour NSSM ou la tache planifiee),
et la verification :

```bat
curl http://localhost:8787/health
```

### Le tunnel

Le webhook Stripe doit pouvoir joindre le mini-PC pour reclamer un original
vendu. Un tunnel sort du reseau vers Cloudflare, sans ouvrir de port sur le
routeur du parc :

```bat
cloudflared tunnel create crocparc-bridge
cloudflared tunnel route dns crocparc-bridge pont.crocparc.re
:: config.yml : service http://127.0.0.1:8788
cloudflared service install
```

Verifiez ensuite que `BRIDGE_FETCH_URL` dans `wrangler.toml` pointe bien sur
`https://pont.crocparc.re/fetch-original`, et redeployez.

Sans tunnel, la chaine fonctionne quand meme : les originaux sont simplement
reclames au moment du telechargement, et le client patiente pendant que le pont
les envoie. Le tunnel rend cette etape invisible pour lui.

---

## 4. Make

Un webhook est deja cree :

```
https://hook.eu1.make.com/psq8emt5j3k9757ecyoi2j5tp95o19hu
```

1. Make > Scenarios > Create a new scenario > ... > **Import Blueprint**, et
   choisissez `make/scenario-vente-confirmee.json`.
2. Ouvrez les deux modules e-mail et **choisissez une connexion d'envoi**. Les
   deux connexions existantes appartiennent a l'autre activite
   (`info@yoga-doula.eu`) : creez-en une pour `photos@crocparc.re`, sinon vos
   clients recevront leurs photos depuis une adresse qui n'a rien a voir.
3. Verifiez l'adresse d'alerte du second module (votre adresse).
4. Activez le scenario.
5. Posez l'URL du webhook en secret :
   ```bash
   npx wrangler pages secret put MAKE_WEBHOOK_URL --project-name crocparc-photos
   ```

C'est un secret et non une variable : qui connait l'URL peut vous envoyer de
faux courriels de vente.

Le scenario coute 3 operations par vente. Sur le forfait Core (10 000 par
mois), et compte tenu des 7 scenarios deja en place, cela laisse largement de
quoi tenir.

**Make n'est jamais bloquant.** S'il tombe, la commande reste valide et le
client telecharge depuis la page de retour : il perd seulement le courriel.

---

## 5. Les cartes

```bash
pip install -e "bridge[cards]"
python3 tools/generate-cards.py --nombre 300 --sortie cartes/
```

Imprimez, decoupez, et **gardez `cartes/inventaire.csv`** : c'est la liste des
codes deja tires, que le generateur relit pour ne jamais en reutiliser un.

Comptez large : une carte ne doit pas repartir en circulation avant 30 jours.
Si cela arrive, le pont met la carte en quarantaine, les photos du groupe
partent en session orpheline et la vente est perdue. A dix groupes par jour,
300 cartes donnent un mois de rotation — c'est le minimum, 400 est plus
confortable.

---

## 6. La repetition generale

Avant d'ouvrir au public, faites une visite d'essai complete :

1. photographiez une carte, puis trois photos ;
2. verifiez sur `http://localhost:8787/health` que le pont a tout traite ;
3. ouvrez la console d'admin : la session doit apparaitre avec ses trois photos ;
4. scannez le QR de la carte avec un telephone : la galerie doit s'afficher ;
5. achetez avec la carte de test Stripe ;
6. telechargez, et **ouvrez les fichiers obtenus** — ce sont les originaux, sans
   filigrane, a la bonne resolution ;
7. verifiez que le courriel de Make est arrive.

Si les sept points passent, vous pouvez ouvrir. Sinon, la console d'admin et
`python -m bridge status` disent ou ca coince.
