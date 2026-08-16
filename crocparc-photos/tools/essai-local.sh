#!/usr/bin/env bash
#
# Essai sur table, sans aucun compte.
#
# Monte toute la chaine sur cette machine : le pont, la base, l'API et la
# galerie. Vous deposez des photos dans un dossier, vous ouvrez la galerie sur
# votre telephone. Rien ne sort du reseau local, rien n'est facture, rien n'est
# publie.
#
#   ./tools/essai-local.sh
#
# Ce que ca ne couvre pas : le paiement Stripe (il faut des cles) et le tunnel.
# Tout le reste -- la carte photographiee, le tri par session, les previews
# filigranees, la galerie sur telephone -- est reel.

set -euo pipefail

RACINE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$RACINE"

INBOX="${INBOX:-$RACINE/essai/inbox}"
DONNEES="${DONNEES:-$RACINE/essai/data}"
PORT_SITE="${PORT_SITE:-8976}"
PORT_IMAGES="${PORT_IMAGES:-8977}"
# Le pont et l'API doivent partager le MEME secret, sinon chaque declaration
# est refusee en 401. wrangler lit .dev.vars : on s'aligne dessus plutot que
# d'inventer une valeur de notre cote.
DEV_VARS="$RACINE/.dev.vars"
if [ -f "$DEV_VARS" ] && grep -q '^BRIDGE_SHARED_SECRET=' "$DEV_VARS"; then
  SECRET="$(grep '^BRIDGE_SHARED_SECRET=' "$DEV_VARS" | head -1 | cut -d= -f2- | sed 's/^"//; s/"$//')"
else
  SECRET="essai-local-secret-de-plus-de-32-caracteres"
  printf 'BRIDGE_SHARED_SECRET=%s\nSESSION_TTL_DAYS=30\n' "$SECRET" > "$DEV_VARS"
fi

vert()  { printf '\033[32m%s\033[0m\n' "$*"; }
rouge() { printf '\033[31m%s\033[0m\n' "$*" >&2; }
jaune() { printf '\033[33m%s\033[0m\n' "$*"; }
etape() { printf '\n\033[1m== %s\033[0m\n' "$*"; }

# Adresse de la machine sur le reseau local : c'est elle que le telephone vise.
adresse_locale() {
  if command -v ip >/dev/null 2>&1; then
    ip -4 route get 1.1.1.1 2>/dev/null | grep -oP 'src \K\S+' | head -1 && return
  fi
  if command -v ipconfig >/dev/null 2>&1; then
    ipconfig getifaddr en0 2>/dev/null && return
  fi
  hostname -I 2>/dev/null | awk '{print $1}'
}

IP="$(adresse_locale || true)"
IP="${IP:-127.0.0.1}"

nettoyer() {
  etape "Arret"
  [ -n "${PID_SITE:-}" ] && kill "$PID_SITE" 2>/dev/null || true
  [ -n "${PID_IMAGES:-}" ] && kill "$PID_IMAGES" 2>/dev/null || true
  [ -n "${PID_PONT:-}" ] && kill "$PID_PONT" 2>/dev/null || true
  vert "Tout est arrete. Les fichiers restent dans $RACINE/essai/"
}
trap nettoyer EXIT INT TERM

# Les ports doivent etre LIBRES avant de commencer. Verifier seulement que
# « quelque chose repond » ensuite ne suffit pas : un service reste d'un essai
# precedent repond tres bien, avec l'ancienne configuration -- et on passe une
# demi-heure a chercher pourquoi les signatures sont refusees.
etape "Ports"
port_occupe() {
  local port="$1"
  (exec 3<>"/dev/tcp/127.0.0.1/$port") 2>/dev/null && exec 3>&- && return 0
  return 1
}

occupes=""
for port in "$PORT_SITE" "$PORT_IMAGES" 8787; do
  port_occupe "$port" && occupes="$occupes $port"
done

if [ -n "$occupes" ]; then
  rouge "Ports deja occupes :$occupes"
  jaune "Un essai precedent tourne probablement encore. Pour tout arreter :"
  jaune "   pkill -f 'bridge run'"
  jaune "   pkill -f workerd"
  jaune "   pkill -f 'http.server $PORT_IMAGES'"
  exit 1
fi
vert "Ports libres."

etape "Preparation"
mkdir -p "$INBOX" "$DONNEES"
[ -d node_modules ] || npm install --silent
npx --yes wrangler d1 migrations apply crocparc-photos --local >/dev/null 2>&1
vert "Base locale prete."

etape "Cartes a imprimer"
if [ ! -f "$RACINE/essai/cartes/inventaire.csv" ]; then
  python3 tools/generate-cards.py --nombre 8 --sortie "$RACINE/essai/cartes" \
    --base-url "http://$IP:$PORT_SITE/g/" >/dev/null
fi
vert "Planche : $RACINE/essai/cartes/"
jaune "Imprimez-la (ou affichez-la sur un ecran, ca suffit pour l'essai)."
echo "   Les QR pointent sur http://$IP:$PORT_SITE/g/<CODE> — donc sur cette machine."
echo
column -s, -t "$RACINE/essai/cartes/inventaire.csv" 2>/dev/null | head -10 \
  || cat "$RACINE/essai/cartes/inventaire.csv"

etape "Demarrage des services"
npx --yes wrangler pages dev --ip 0.0.0.0 --port "$PORT_SITE" \
  --binding PREVIEWS_BASE_URL="http://$IP:$PORT_IMAGES" ADMIN_TOKEN="essai" \
  >"$RACINE/essai/site.log" 2>&1 &
PID_SITE=$!

mkdir -p "$DONNEES/out/crocparc-previews"
( cd "$DONNEES/out/crocparc-previews" && python3 -m http.server "$PORT_IMAGES" --bind 0.0.0.0 \
  >"$RACINE/essai/images.log" 2>&1 ) &
PID_IMAGES=$!

( cd bridge && WATCH_DIR="$INBOX" BRIDGE_DATA_DIR="$DONNEES" \
    BRIDGE_REGISTRAR_BACKEND=api \
    BRIDGE_INGEST_URL="http://127.0.0.1:$PORT_SITE/api/ingest" \
    BRIDGE_SHARED_SECRET="$SECRET" \
    BRIDGE_ASSIGN_GRACE_SECONDS=5 \
    PYTHONPATH=src python3 -m bridge run --env /nonexistent \
    >"$RACINE/essai/pont.log" 2>&1 ) &
PID_PONT=$!

sleep 12

# Verifier que les trois services tournent vraiment : sans ce controle, un pont
# reste d'un essai precedent fait echouer le nouveau (le verrou d'instance
# refuse le second, et c'est tant mieux) et le script continuerait en silence.
etape "Controle"
ennui=0
if ! curl -s -m 5 "http://127.0.0.1:8787/health" >/dev/null 2>&1; then
  rouge "Le pont n'a pas demarre."
  tail -5 "$RACINE/essai/pont.log" >&2 || true
  jaune "Un pont d'un essai precedent tourne peut-etre encore."
  jaune "Arretez-le, puis relancez."
  ennui=1
fi
if ! curl -s -m 5 "http://127.0.0.1:$PORT_SITE/" >/dev/null 2>&1; then
  rouge "Le site n'a pas demarre."
  tail -5 "$RACINE/essai/site.log" >&2 || true
  ennui=1
fi
if ! curl -s -m 5 "http://127.0.0.1:$PORT_IMAGES/" >/dev/null 2>&1; then
  rouge "Le serveur d'images n'a pas demarre (port $PORT_IMAGES deja pris ?)."
  ennui=1
fi
[ "$ennui" -eq 0 ] || exit 1
vert "Les trois services repondent."

etape "C'est pret"
cat <<FIN

  1. Photographiez une carte de la planche, puis deux ou trois sujets.
  2. Copiez les JPEG de la carte memoire vers :

       $INBOX

     (glisser-deposer suffit — le FTP n'est pas necessaire pour un essai)

  3. Attendez une dizaine de secondes, puis ouvrez sur votre telephone,
     connecte au MEME reseau wifi :

       http://$IP:$PORT_SITE

     ou scannez directement le QR de la carte que vous avez photographiee.

  Console d'administration : http://$IP:$PORT_SITE/admin.html   (jeton : essai)
  Etat du pont             : http://127.0.0.1:8787/health
  Journaux                 : essai/pont.log, essai/site.log

  Le bouton d'achat ne fonctionnera pas : il n'y a pas de cle Stripe. Tout le
  reste est reel — le tri par carte, le filigrane, la galerie.

  Ctrl+C pour tout arreter.

FIN

# On reste au premier plan pour que Ctrl+C arrete l'ensemble.
wait "$PID_SITE"
