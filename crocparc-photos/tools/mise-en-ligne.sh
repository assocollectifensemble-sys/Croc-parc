#!/usr/bin/env bash
#
# Mise en ligne de Croc Parc Photos sur Cloudflare.
#
# Le script est **rejouable** : chaque etape verifie d'abord si la ressource
# existe deja. Il s'arrete a la premiere erreur plutot que de continuer sur un
# etat a moitie construit.
#
#   npx wrangler login            # une fois, dans un navigateur
#   ./tools/mise-en-ligne.sh
#
# Rien n'est detruit : le script cree ce qui manque, et laisse le reste en
# place. Les secrets deja poses ne sont pas ecrases sans qu'on le demande.

set -euo pipefail

RACINE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$RACINE"

PROJET="crocparc-photos"
BASE="crocparc-photos"
BUCKET_PREVIEWS="crocparc-previews"
BUCKET_ORIGINAUX="crocparc-originals"
SECRETS_LOCAUX="$RACINE/.secrets-mise-en-ligne"

vert()  { printf '\033[32m%s\033[0m\n' "$*"; }
jaune() { printf '\033[33m%s\033[0m\n' "$*"; }
rouge() { printf '\033[31m%s\033[0m\n' "$*" >&2; }
etape() { printf '\n\033[1m== %s\033[0m\n' "$*"; }

wr() { npx --yes wrangler "$@"; }

# --- 0. Verifications prealables --------------------------------------------
etape "Verifications"

# On cherche la marque de l'echec, pas celle du succes : le message d'erreur de
# wrangler contient lui-meme le mot « account », et un test naif le prend pour
# une authentification reussie.
SORTIE_WHOAMI="$(wr whoami 2>&1 || true)"
if printf '%s' "$SORTIE_WHOAMI" | grep -qiE "not authenticated|CLOUDFLARE_API_TOKEN|wrangler login"; then
  rouge "Wrangler n'est pas authentifie. Lancez d'abord :  npx wrangler login"
  rouge "(ou definissez CLOUDFLARE_API_TOKEN dans l'environnement)"
  exit 1
fi
if ! printf '%s' "$SORTIE_WHOAMI" | grep -qiE "account id|account name"; then
  rouge "Reponse inattendue de wrangler whoami :"
  printf '%s\n' "$SORTIE_WHOAMI" >&2
  exit 1
fi
vert "Wrangler authentifie."

if [ ! -f "$RACINE/wrangler.toml" ]; then
  rouge "wrangler.toml introuvable : lancez le script depuis le depot."
  exit 1
fi

# --- 1. Projet Pages ---------------------------------------------------------
etape "Projet Pages"

if wr pages project list --json 2>/dev/null | grep -q "\"name\": *\"$PROJET\""; then
  vert "Le projet $PROJET existe deja."
else
  wr pages project create "$PROJET" --production-branch main
  vert "Projet $PROJET cree."
fi

# --- 2. Base de donnees D1 ---------------------------------------------------
etape "Base de donnees D1"

ID_BASE="$(wr d1 list --json 2>/dev/null \
  | python3 -c "
import json,sys
try:
    bases = json.load(sys.stdin)
except Exception:
    bases = []
print(next((b['uuid'] for b in bases if b.get('name') == '$BASE'), ''))
")"

if [ -z "$ID_BASE" ]; then
  wr d1 create "$BASE"
  ID_BASE="$(wr d1 list --json | python3 -c "
import json,sys
print(next((b['uuid'] for b in json.load(sys.stdin) if b.get('name') == '$BASE'), ''))
")"
  vert "Base $BASE creee."
else
  vert "La base $BASE existe deja."
fi

if [ -z "$ID_BASE" ]; then
  rouge "Impossible de retrouver l'identifiant de la base $BASE."
  exit 1
fi
echo "   identifiant : $ID_BASE"

# Le meme identifiant doit figurer dans les deux configurations : si le Worker
# de purge vise une autre base, il tourne chaque nuit dans le vide en
# journalisant une purge reussie.
python3 - "$ID_BASE" <<'PY'
import re, sys
from pathlib import Path

identifiant = sys.argv[1]
for chemin in (Path("wrangler.toml"), Path("workers/purge/wrangler.toml")):
    texte = chemin.read_text(encoding="utf-8")
    nouveau = re.sub(
        r'database_id\s*=\s*"[^"]*"', f'database_id = "{identifiant}"', texte
    )
    if nouveau != texte:
        chemin.write_text(nouveau, encoding="utf-8")
        print(f"   {chemin} mis a jour")
PY

# --- 3. Buckets R2 -----------------------------------------------------------
etape "Buckets R2"

for bucket in "$BUCKET_PREVIEWS" "$BUCKET_ORIGINAUX"; do
  if wr r2 bucket list 2>/dev/null | grep -q "$bucket"; then
    vert "Le bucket $bucket existe deja."
  else
    wr r2 bucket create "$bucket"
    vert "Bucket $bucket cree."
  fi
done

jaune "Le bucket $BUCKET_ORIGINAUX doit rester PRIVE : ne lui donnez aucun acces public."

# --- 4. Schema ---------------------------------------------------------------
etape "Migrations"
wr d1 migrations apply "$BASE" --remote
vert "Schema applique."

# --- 5. Secrets --------------------------------------------------------------
etape "Secrets"

# Le secret partage est genere ici s'il n'existe pas encore, et conserve en
# local : le pont du parc a besoin exactement de la meme valeur.
if [ -f "$SECRETS_LOCAUX" ]; then
  # shellcheck disable=SC1090
  . "$SECRETS_LOCAUX"
  vert "Secrets locaux relus depuis .secrets-mise-en-ligne"
else
  BRIDGE_SHARED_SECRET="$(openssl rand -hex 32)"
  ADMIN_TOKEN="$(openssl rand -hex 24)"
  umask 077
  cat > "$SECRETS_LOCAUX" <<EOF
# Genere par tools/mise-en-ligne.sh — NE PAS COMMITER.
# BRIDGE_SHARED_SECRET doit etre recopie a l'identique dans bridge/.env
BRIDGE_SHARED_SECRET="$BRIDGE_SHARED_SECRET"
ADMIN_TOKEN="$ADMIN_TOKEN"
EOF
  vert "Secrets generes et ecrits dans .secrets-mise-en-ligne (ignore par git)."
fi

poser_secret() {
  local nom="$1" valeur="$2"
  if [ -z "$valeur" ]; then
    jaune "   $nom : ignore (valeur vide)"
    return
  fi
  printf '%s' "$valeur" | wr pages secret put "$nom" --project-name "$PROJET" >/dev/null
  vert "   $nom pose."
}

poser_secret BRIDGE_SHARED_SECRET "$BRIDGE_SHARED_SECRET"
poser_secret ADMIN_TOKEN "$ADMIN_TOKEN"

# Les cles Stripe viennent de son tableau de bord : on les demande, sans les
# ecrire nulle part.
if [ -t 0 ]; then
  echo
  read -rsp "Cle secrete Stripe (sk_test_... ou sk_live_..., vide pour passer) : " STRIPE_SECRET_KEY; echo
  poser_secret STRIPE_SECRET_KEY "${STRIPE_SECRET_KEY:-}"
  read -rsp "Secret du webhook Stripe (whsec_..., vide pour passer)          : " STRIPE_WEBHOOK_SECRET; echo
  poser_secret STRIPE_WEBHOOK_SECRET "${STRIPE_WEBHOOK_SECRET:-}"
  # L'URL du webhook Make est un secret : qui la connait peut declencher de
  # faux courriels de vente.
  read -rp  "URL du webhook Make (vide pour passer)                          : " MAKE_WEBHOOK_URL
  poser_secret MAKE_WEBHOOK_URL "${MAKE_WEBHOOK_URL:-}"
else
  jaune "Entree non interactive : posez les cles Stripe a la main."
  echo "   npx wrangler pages secret put STRIPE_SECRET_KEY --project-name $PROJET"
  echo "   npx wrangler pages secret put STRIPE_WEBHOOK_SECRET --project-name $PROJET"
  echo "   npx wrangler pages secret put MAKE_WEBHOOK_URL --project-name $PROJET"
fi

# --- 6. Deploiement ----------------------------------------------------------
etape "Deploiement du site"
wr pages deploy --project-name "$PROJET"
vert "Site deploye."

etape "Deploiement du Worker de purge"
wr deploy --config workers/purge/wrangler.toml
vert "Purge quotidienne active (03h00 UTC, soit 07h00 a La Reunion)."

# --- 7. Ce qui reste a faire a la main ---------------------------------------
etape "Il reste ces etapes, qui ne peuvent pas etre automatisees"

cat <<'FIN'

1. ACCES PUBLIC AUX PREVIEWS
   Le bucket des previews doit etre lisible publiquement, et lui seul.
     npx wrangler r2 bucket dev-url enable crocparc-previews
   Reportez l'URL obtenue dans wrangler.toml (PREVIEWS_BASE_URL), puis
   redeployez. Un domaine personnalise (previews.crocparc.re) est preferable
   pour la production.

2. WEBHOOK STRIPE
   Tableau de bord Stripe > Developpeurs > Webhooks > Ajouter un point de
   terminaison :
     URL          https://photos.crocparc.re/api/webhook/stripe
     Evenements   checkout.session.completed
                  checkout.session.async_payment_succeeded
   Recopiez le secret whsec_... et relancez ce script pour le poser.

3. TUNNEL VERS LE MINI-PC
   Sur le mini-PC du parc :
     cloudflared tunnel create crocparc-bridge
     cloudflared tunnel route dns crocparc-bridge pont.crocparc.re
     # config.yml : service http://127.0.0.1:8788
     cloudflared service install
   Puis verifiez que BRIDGE_FETCH_URL dans wrangler.toml pointe bien dessus.

4. LE PONT
   Recopiez BRIDGE_SHARED_SECRET (fichier .secrets-mise-en-ligne) dans
   bridge/.env, avec :
     BRIDGE_STORAGE_BACKEND=r2
     BRIDGE_REGISTRAR_BACKEND=api
     BRIDGE_INGEST_URL=https://photos.crocparc.re/api/ingest
     R2_ENDPOINT / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY
   Les identifiants R2 se creent dans le tableau de bord Cloudflare,
   rubrique R2 > Manage API tokens.

5. VERIFICATION DE BOUT EN BOUT
   Faites une vraie visite d'essai : photographiez une carte, puis trois
   photos, et suivez la chaine jusqu'au telechargement avec une carte de test
   Stripe (4242 4242 4242 4242).

FIN

vert "Termine."
