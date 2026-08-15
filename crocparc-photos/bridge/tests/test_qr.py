"""Codes de carte et detection du separateur de session."""

from __future__ import annotations

from datetime import datetime

import pytest

from bridge.qr import (
    ALPHABET,
    ORPHAN_CODE,
    detect_card,
    load_inventory,
    normalize_code,
    parse_payload,
)
from bridge.imaging import open_oriented
from conftest import make_card, make_photo


@pytest.mark.parametrize("raw,expected", [
    ("K7M2QP", "K7M2QP"),
    ("k7m2qp", "K7M2QP"),
    ("  k7m2qp  ", "K7M2QP"),
])
def test_codes_valides(raw, expected):
    assert normalize_code(raw) == expected


@pytest.mark.parametrize("raw", ["", None, "K7M2Q", "K7M2QPP", "K7M2Q0", "K7M2QI", "K7M2Q1", "K7M2QO", "K7M2Q-"])
def test_codes_invalides(raw):
    assert normalize_code(raw) is None


def test_alphabet_sans_caracteres_ambigus():
    assert set("IO01") & set(ALPHABET) == set()


def test_code_orphelin_impossible_a_imprimer():
    # ORPHAN contient un O : aucune carte reelle ne peut porter ce code, il est
    # donc utilisable comme marqueur interne sans risque de collision.
    assert normalize_code(ORPHAN_CODE) is None


def test_parse_url_complete():
    card = parse_payload("https://photos.crocparc.re/g/K7M2QP")
    assert card is not None and card.code == "K7M2QP" and card.card_number is None


def test_parse_url_avec_numero_de_carte():
    card = parse_payload("https://photos.crocparc.re/g/K7M2QP?n=427")
    assert card is not None and card.code == "K7M2QP" and card.card_number == 427


def test_parse_code_seul():
    card = parse_payload("k7m2qp")
    assert card is not None and card.code == "K7M2QP"


@pytest.mark.parametrize("payload", [
    "",
    "https://photos.crocparc.re/g/",
    "https://photos.crocparc.re/g/TROPLONG",
    "https://exemple.fr/rien",
    "du texte quelconque",
])
def test_parse_charges_utiles_invalides(payload):
    assert parse_payload(payload) is None


def test_detection_sur_photo_de_carte(tmp_path, config):
    path = make_card(tmp_path / "DSC00001.JPG", "K7M2QP", datetime(2026, 10, 15, 10, 0, 0))
    with open_oriented(path) as image:
        card = detect_card(image, config.qr_scan_max_edge)
    assert card is not None and card.code == "K7M2QP"


def test_detection_transporte_le_numero_de_carte(tmp_path, config):
    path = make_card(tmp_path / "DSC00002.JPG", "K7M2QP", card_number=427)
    with open_oriented(path) as image:
        card = detect_card(image, config.qr_scan_max_edge)
    assert card is not None and card.card_number == 427


def test_photo_ordinaire_n_est_pas_une_carte(tmp_path, config):
    path = make_photo(tmp_path / "DSC00003.JPG", datetime(2026, 10, 15, 10, 5, 0), seed=3)
    with open_oriented(path) as image:
        assert detect_card(image, config.qr_scan_max_edge) is None


def test_inventaire_csv(tmp_path):
    csv_path = tmp_path / "cartes.csv"
    csv_path.write_text("code,card_number\nK7M2QP,427\nMAUVAIS,12\nQ4RT5Y,\n", encoding="utf-8")
    assert load_inventory(csv_path) == {"K7M2QP": 427}
    assert load_inventory(tmp_path / "absent.csv") == {}
    assert load_inventory(None) == {}
