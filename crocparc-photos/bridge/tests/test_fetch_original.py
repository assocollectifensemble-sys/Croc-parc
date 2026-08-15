"""Endpoint /fetch-original : le seul point du pont exposable sur Internet.

Deux exigences : personne ne doit pouvoir l'appeler sans le secret partage, et
personne ne doit pouvoir en sortir un fichier situe hors de ORIGINALS_DIR.
"""

from __future__ import annotations

import dataclasses
import json
import socket
import urllib.error
import urllib.request
from datetime import datetime
from pathlib import Path

import pytest

from bridge.fetch_original import FetchError, FetchServer, push_originals, resolve_original
from bridge.signing import SIGNATURE_HEADER, TIMESTAMP_HEADER, sign
from bridge.uploader import LocalStorage
from conftest import make_photo

SECRET = "un-secret-partage-de-plus-de-32-caracteres"


def port_libre() -> int:
    with socket.socket() as sonde:
        sonde.bind(("127.0.0.1", 0))
        return sonde.getsockname()[1]


@pytest.fixture
def archive(config):
    """Un original archive, comme apres un passage du pont."""
    chemin = config.originals_dir / "2026-10-15" / "K7M2QP" / "DSC01234.JPG"
    make_photo(chemin, datetime(2026, 10, 15, 10, 32, 14), size=(1200, 800), seed=1)
    return "2026-10-15/K7M2QP/DSC01234.JPG"


# -- cloisonnement ------------------------------------------------------------
def test_resolution_d_un_chemin_normal(config, archive):
    resolu = resolve_original(config.originals_dir, archive)
    assert resolu.is_file()
    assert config.originals_dir.resolve() in resolu.parents


@pytest.mark.parametrize(
    "chemin",
    [
        "../.env",
        "2026-10-15/../../../etc/passwd",
        "/etc/passwd",
        "C:/Windows/System32/config/SAM",
        "..\\..\\secrets.txt",
        "",
    ],
)
def test_chemins_refuses(config, chemin):
    with pytest.raises(FetchError) as echec:
        resolve_original(config.originals_dir, chemin)
    assert echec.value.status == 400


def test_double_slash_normalise_sans_echappatoire(config, archive):
    # PurePosixPath ecrase le double separateur : le chemin reste le meme
    # fichier, il n'y a rien a refuser.
    assert resolve_original(config.originals_dir, "2026-10-15//K7M2QP/DSC01234.JPG").is_file()


def test_original_absent(config):
    with pytest.raises(FetchError) as echec:
        resolve_original(config.originals_dir, "2026-10-15/K7M2QP/ABSENTE.JPG")
    assert echec.value.status == 404


def test_lien_symbolique_vers_l_exterieur_refuse(config, tmp_path):
    """Un lien pose dans l'archive ne doit pas servir de passe-droit."""
    secret = tmp_path / "hors-perimetre.txt"
    secret.write_text("donnees privees", encoding="utf-8")
    piege = config.originals_dir / "2026-10-15" / "K7M2QP"
    piege.mkdir(parents=True, exist_ok=True)
    (piege / "lien.JPG").symlink_to(secret)
    with pytest.raises(FetchError):
        resolve_original(config.originals_dir, "2026-10-15/K7M2QP/lien.JPG")


# -- depot --------------------------------------------------------------------
def test_depot_et_idempotence(config, archive):
    stockage = LocalStorage(config.output_dir)
    premier = push_originals(config, stockage, [archive])
    assert premier[archive]["key"] == f"originals/{archive}"
    depose = config.output_dir / config.originals_bucket / f"originals/{archive}"
    assert depose.is_file()

    empreinte = depose.stat().st_mtime_ns
    second = push_originals(config, stockage, [archive])
    assert second == premier
    assert depose.stat().st_mtime_ns == empreinte  # rien n'a ete reecrit


def test_demande_vide_ou_trop_grosse(config):
    stockage = LocalStorage(config.output_dir)
    for demande in ([], None, "2026-10-15/K7M2QP/DSC1.JPG"):
        with pytest.raises(FetchError):
            push_originals(config, stockage, demande)
    with pytest.raises(FetchError, match="trop de chemins"):
        push_originals(config, stockage, ["a/b.JPG"] * 201)


# -- endpoint HTTP ------------------------------------------------------------
@pytest.fixture
def serveur(config, archive):
    configuration = dataclasses.replace(
        config, fetch_port=port_libre(), shared_secret=SECRET
    )
    service = FetchServer(configuration, LocalStorage(configuration.output_dir))
    service.start()
    yield configuration
    service.stop()


def appeler(configuration, charge: dict, secret: str = SECRET, decalage: int = 0) -> tuple[int, dict]:
    corps = json.dumps(charge).encode("utf-8")
    horodatage, signature = sign(secret, corps)
    if decalage:
        horodatage = str(int(horodatage) + decalage)
    requete = urllib.request.Request(
        f"http://{configuration.fetch_host}:{configuration.fetch_port}/fetch-original",
        data=corps,
        method="POST",
        headers={
            "Content-Type": "application/json",
            TIMESTAMP_HEADER: horodatage,
            SIGNATURE_HEADER: signature,
        },
    )
    try:
        with urllib.request.urlopen(requete, timeout=10) as reponse:
            return reponse.status, json.loads(reponse.read())
    except urllib.error.HTTPError as exc:
        return exc.code, json.loads(exc.read() or b"{}")


def test_appel_signe(serveur, archive):
    statut, corps = appeler(serveur, {"paths": [archive]})
    assert statut == 200
    assert corps["originals"][archive]["key"] == f"originals/{archive}"
    assert corps["originals"][archive]["bytes"] > 0


def test_appel_non_signe_refuse(serveur, archive):
    statut, _ = appeler(serveur, {"paths": [archive]}, secret="mauvais-secret")
    assert statut == 401


def test_horodatage_perime_refuse(serveur, archive):
    statut, _ = appeler(serveur, {"paths": [archive]}, decalage=-400)
    assert statut == 401


def test_chemin_hors_perimetre_refuse(serveur):
    statut, corps = appeler(serveur, {"paths": ["../../.env"]})
    assert statut == 400
    assert "refuse" in corps["error"]


def test_original_absent_renvoie_404(serveur):
    statut, _ = appeler(serveur, {"paths": ["2026-10-15/K7M2QP/ABSENTE.JPG"]})
    assert statut == 404


def test_route_inconnue(serveur):
    requete = urllib.request.Request(
        f"http://{serveur.fetch_host}:{serveur.fetch_port}/autre",
        data=b"{}",
        method="POST",
    )
    with pytest.raises(urllib.error.HTTPError) as echec:
        urllib.request.urlopen(requete, timeout=10)
    assert echec.value.code == 404
