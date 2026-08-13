#!/usr/bin/env bash
#
# Télécharge les photos réelles du Maï-Taï et du Croc Parc identifiées pendant
# la production du site (voir docs/CREDITS.md § 2).
#
# À exécuter DEPUIS VOTRE MACHINE : l'environnement de développement où le site
# a été produit n'a pas accès à ces domaines.
#
#   bash maitai/docs/telecharger-images.sh
#
# Les fichiers atterrissent dans maitai/images/_a-trier/. Rien n'est écrasé
# ailleurs : le tri, le recadrage et le renommage restent manuels.

set -uo pipefail

DOSSIER="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/images/_a-trier"
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

mkdir -p "$DOSSIER"
echo "→ Destination : $DOSSIER"
echo

# nom-de-fichier|url
IMAGES=(
  # --- Publiées par l'établissement sur Tripadvisor -------------------------
  "tripadvisor-risotto-gambas.jpg|https://media-cdn.tripadvisor.com/media/photo-m/1280/32/6a/6b/e0/risotto-gambas.jpg"
  "tripadvisor-entree-restaurant-foret.jpg|https://dynamic-media-cdn.tripadvisor.com/media/photo-o/32/6a/7b/c8/l-entree-de-notre-restaurant.jpg"

  # --- Publiées sur croc-parc.re (vos propres fichiers) ---------------------
  "crocparc-kiosques-ombrages.jpg|https://croc-parc.re/wp-content/uploads/2024/12/kiosques-2-new-768x481.jpg"
  "crocparc-restauration.webp|https://croc-parc.re/wp-content/uploads/2026/07/image1-1.webp"
  "crocparc-mini-golf.jpg|https://croc-parc.re/wp-content/uploads/2024/12/mini-golf.jpg"
  "crocparc-paon-bleu.jpg|https://croc-parc.re/wp-content/uploads/2024/12/paon.jpg"
  "crocparc-lemurien.png|https://croc-parc.re/wp-content/uploads/2024/12/lemurien.png"
  "crocparc-visite-guidee.jpg|https://croc-parc.re/wp-content/uploads/2024/12/visite-guidee.jpg"
  "crocparc-animations-chasse-au-tresor.jpg|https://croc-parc.re/wp-content/uploads/2024/12/animations-ludiques-chasse-au-tresor.jpg"
  "crocparc-logo.png|https://croc-parc.re/wp-content/uploads/2024/12/LOGO-CROC-PARC.png"
  "crocsnack-carte-1.jpg|https://croc-parc.re/wp-content/uploads/2026/07/LE-CROCSNACK-CARTE1.jpg"
  "crocsnack-carte-2.jpg|https://croc-parc.re/wp-content/uploads/2026/07/LE-CROCSNACK-CARTE-2.jpg"
  "crocsnack-carte-3.jpg|https://croc-parc.re/wp-content/uploads/2026/07/LE-CROCSNACK-CARTE-3-1-3.jpg"
)

ok=0
echec=0

for entree in "${IMAGES[@]}"; do
  nom="${entree%%|*}"
  url="${entree#*|}"
  printf '  %-44s ' "$nom"

  if curl -fsSL -A "$UA" --max-time 60 "$url" -o "$DOSSIER/$nom"; then
    taille=$(wc -c < "$DOSSIER/$nom" | tr -d ' ')
    # Un fichier minuscule est presque toujours une page d'erreur déguisée.
    if [ "$taille" -lt 10000 ]; then
      echo "suspect (${taille} o) — probablement une page d'erreur, supprimé"
      rm -f "$DOSSIER/$nom"
      echec=$((echec + 1))
    else
      echo "ok ($((taille / 1024)) Ko)"
      ok=$((ok + 1))
    fi
  else
    echo "échec"
    echec=$((echec + 1))
  fi
done

echo
echo "Terminé : $ok téléchargée(s), $echec en échec."
echo
echo "Étape suivante : trier, recadrer et compresser (https://squoosh.app),"
echo "puis renommer selon le tableau de docs/CREDITS.md § 1."
