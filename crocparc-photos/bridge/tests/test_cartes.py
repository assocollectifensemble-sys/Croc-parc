"""Le generateur de planches de cartes.

Une carte mal fabriquee ne se voit qu'au moment ou la photographe la remet a
une famille : ce test lit les QR produits comme le ferait le pont.
"""

from __future__ import annotations

import csv
import subprocess
import sys
from pathlib import Path

import pytest
from pdf2image import convert_from_path  # type: ignore[import-untyped]

from bridge.qr import ALPHABET, CODE_LENGTH, detect_card, normalize_code

OUTIL = Path(__file__).resolve().parents[2] / "tools" / "generate-cards.py"


def generer(dossier: Path, nombre: int, base_url: str = "https://photos.crocparc.re/g/"):
    resultat = subprocess.run(
        [sys.executable, str(OUTIL), "--nombre", str(nombre), "--sortie", str(dossier),
         "--base-url", base_url],
        capture_output=True,
        text=True,
        check=True,
    )
    pdfs = sorted(dossier.glob("*.pdf"))
    inventaire = dossier / "inventaire.csv"
    return pdfs[-1], inventaire, resultat.stdout


def lire_inventaire(chemin: Path) -> dict[str, int]:
    with chemin.open(newline="", encoding="utf-8") as fichier:
        return {ligne["code"]: int(ligne["card_number"]) for ligne in csv.DictReader(fichier)}


def test_codes_conformes_a_l_alphabet(tmp_path):
    _, inventaire, _ = generer(tmp_path, 12)
    codes = lire_inventaire(inventaire)
    assert len(codes) == 12
    for code in codes:
        assert normalize_code(code) == code
        assert len(code) == CODE_LENGTH
        assert all(caractere in ALPHABET for caractere in code)


def test_numeros_d_inventaire_continus(tmp_path):
    _, inventaire, _ = generer(tmp_path, 10)
    assert sorted(lire_inventaire(inventaire).values()) == list(range(1, 11))


def test_deuxieme_tirage_ne_reutilise_aucun_code(tmp_path):
    _, inventaire, _ = generer(tmp_path, 10)
    premiers = lire_inventaire(inventaire)
    generer(tmp_path, 10)
    tous = lire_inventaire(inventaire)

    assert len(tous) == 20
    assert set(premiers).issubset(tous)  # aucun code ne disparait
    assert sorted(tous.values()) == list(range(1, 21))  # la numerotation continue


@pytest.mark.parametrize("base_url", [
    "https://photos.crocparc.re/g/",
    "https://photos.crocparc.org/g/",  # un domaine finissant par g
])
def test_les_qr_imprimes_sont_lisibles_par_le_pont(tmp_path, base_url):
    """Le vrai test : on relit la planche comme le pont relira la photo."""
    pdf, inventaire, _ = generer(tmp_path, 8, base_url=base_url)
    codes = set(lire_inventaire(inventaire))

    pages = convert_from_path(pdf, dpi=200)
    assert len(pages) == 1  # 8 cartes tiennent sur une planche

    lus = set()
    for page in pages:
        # On decoupe la planche en 8 pour presenter un QR a la fois, comme sur
        # une photo de carte.
        largeur, hauteur = page.size
        for ligne in range(4):
            for colonne in range(2):
                zone = page.crop((
                    colonne * largeur // 2,
                    ligne * hauteur // 4,
                    (colonne + 1) * largeur // 2,
                    (ligne + 1) * hauteur // 4,
                ))
                carte = detect_card(zone, max_edge=1024)
                if carte:
                    lus.add(carte.code)

    assert lus == codes


def test_url_du_parc_affichee_sans_le_suffixe_de_route(tmp_path):
    pdf, _, _ = generer(tmp_path, 2, base_url="https://photos.crocparc.org/g/")
    texte = subprocess.run(
        ["pdftotext", str(pdf), "-"], capture_output=True, text=True, check=True
    ).stdout
    assert "photos.crocparc.org" in texte
    assert "photos.crocparc.or" not in texte.replace("photos.crocparc.org", "")
