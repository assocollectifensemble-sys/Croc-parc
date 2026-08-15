"""Detection des cartes separatrices.

Une carte porte un QR encodant l'URL complete de la galerie, par exemple
`https://photos.crocparc.re/g/K7M2QP`. Photographier la carte ouvre une nouvelle
session ; la photo de la carte n'est jamais publiee.
"""

from __future__ import annotations

import csv
import logging
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from PIL import Image, ImageOps
from pyzbar.pyzbar import ZBarSymbol
from pyzbar.pyzbar import decode as zbar_decode

from .models import CardRef

log = logging.getLogger(__name__)

#: Alphabet des codes : ni I, ni O, ni 0, ni 1 (confusions a la lecture).
ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
CODE_LENGTH = 6

#: Code reserve aux photos arrivees avant toute carte. Il contient un "O",
#: absent de l'alphabet : aucune carte reelle ne peut porter ce code.
ORPHAN_CODE = "ORPHAN"


def normalize_code(raw: str | None) -> str | None:
    """Retourne le code en majuscules s'il est valide, sinon None."""
    if not raw:
        return None
    candidate = raw.strip().upper()
    if len(candidate) != CODE_LENGTH:
        return None
    if any(char not in ALPHABET for char in candidate):
        return None
    return candidate


def parse_payload(payload: str) -> CardRef | None:
    """Extrait un code (et si present un numero de carte) du contenu d'un QR.

    Accepte l'URL complete de la galerie, ou le code seul si une carte a ete
    imprimee avec un QR minimal. Le numero d'inventaire peut voyager dans le
    parametre `?n=427`, sinon il est resolu via l'inventaire CSV.
    """
    if not payload:
        return None
    text = payload.strip()

    code = normalize_code(text)
    if code:
        return CardRef(code=code, payload=text)

    parsed = urlparse(text)
    if not parsed.scheme:
        return None
    segments = [segment for segment in parsed.path.split("/") if segment]
    if not segments:
        return None
    code = normalize_code(segments[-1])
    if not code:
        return None

    card_number = None
    raw_number = parse_qs(parsed.query).get("n", [None])[0]
    if raw_number and raw_number.isdigit():
        card_number = int(raw_number)
    return CardRef(code=code, card_number=card_number, payload=text)


def load_inventory(path: Path | None) -> dict[str, int]:
    """Charge la table code -> numero d'inventaire physique.

    Le fichier est produit par tools/generate-cards.py. Son absence n'est pas une
    erreur : le numero de carte est un confort pour la photographe, pas une
    donnee dont depend la chaine.
    """
    if path is None or not path.is_file():
        return {}
    inventory: dict[str, int] = {}
    with path.open(newline="", encoding="utf-8") as handle:
        for row in csv.DictReader(handle):
            code = normalize_code(row.get("code"))
            raw_number = (row.get("card_number") or "").strip()
            if code and raw_number.isdigit():
                inventory[code] = int(raw_number)
    log.info("inventaire des cartes charge", extra={"count": len(inventory)})
    return inventory


def _decode(image: Image.Image) -> list[str]:
    return [
        symbol.data.decode("utf-8", errors="replace")
        for symbol in zbar_decode(image, symbols=[ZBarSymbol.QRCODE])
    ]


def detect_card(image: Image.Image, max_edge: int = 1024) -> CardRef | None:
    """Cherche un QR de carte dans une image deja orientee.

    Deux passes : une version reduite en niveaux de gris (rapide, suffit dans
    l'immense majorite des cas), puis une version deux fois plus grande avec
    contraste normalise si la premiere n'a rien trouve (carte floue, contre-jour).
    Retourne None si aucun QR exploitable : la photo sera traitee normalement.
    """
    for edge, autocontrast in ((max_edge, False), (max_edge * 2, True)):
        scan = image.convert("L")
        if max(scan.size) > edge:
            scan = ImageOps.contain(scan, (edge, edge), Image.Resampling.BILINEAR)
        if autocontrast:
            scan = ImageOps.autocontrast(scan)
        for payload in _decode(scan):
            card = parse_payload(payload)
            if card:
                return card
            log.warning(
                "QR lu mais code invalide",
                extra={"payload": payload[:120]},
            )
        if max(image.size) <= edge:
            break  # inutile de reessayer plus grand que l'original
    return None
