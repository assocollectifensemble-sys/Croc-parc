"""Sorties reelles du pont : depot R2 (S3) et appel a /api/ingest.

R2 est simule par moto, qui parle le vrai protocole S3 ; l'API est simulee par
un serveur local qui verifie la signature exactement comme la Function.
"""

from __future__ import annotations

import dataclasses
import json
import socket
import threading
from datetime import datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import pytest

from bridge.models import FileRow, FileState, SessionRow, SessionStatus
from bridge.signing import SIGNATURE_HEADER, TIMESTAMP_HEADER, SignatureError, verify
from bridge.uploader import (
    ApiRegistrar,
    LocalStorage,
    R2Storage,
    RegistrarError,
    build_payload,
    create_registrar,
    create_storage,
)
from conftest import make_photo

SECRET = "un-secret-partage-de-plus-de-32-caracteres"


def port_libre() -> int:
    with socket.socket() as sonde:
        sonde.bind(("127.0.0.1", 0))
        return sonde.getsockname()[1]


@pytest.fixture
def session():
    return SessionRow(
        id="11111111-1111-1111-1111-111111111111",
        code="K7M2QP",
        card_number=427,
        session_date="2026-10-15",
        created_at="2026-10-15T10:00:00+04:00",
        expires_at="2026-11-14",
        photo_count=1,
        status=SessionStatus.ACTIVE,
    )


@pytest.fixture
def photo(tmp_path):
    return FileRow(
        path=tmp_path / "DSC01234.JPG",
        filename="DSC01234.JPG",
        state=FileState.UPLOADED,
        shot_at="2026-10-15T10:32:14+04:00",
        width=2048,
        height=1365,
        preview_key="2026-10-15/K7M2QP/DSC01234_p.jpg",
        thumb_key="2026-10-15/K7M2QP/DSC01234_t.jpg",
        original_path="2026-10-15/K7M2QP/DSC01234.JPG",
        session_id="11111111-1111-1111-1111-111111111111",
    )


# -- contrat de la charge utile ----------------------------------------------
def test_charge_utile_conforme_au_contrat(session, photo):
    charge = build_payload(session, [photo])
    assert charge == {
        "code": "K7M2QP",
        "card_number": 427,
        "session_date": "2026-10-15",
        "photos": [
            {
                "filename": "DSC01234.JPG",
                "shot_at": "2026-10-15T10:32:14+04:00",
                "preview_key": "2026-10-15/K7M2QP/DSC01234_p.jpg",
                "thumb_key": "2026-10-15/K7M2QP/DSC01234_t.jpg",
                "original_path": "2026-10-15/K7M2QP/DSC01234.JPG",
                "width": 2048,
                "height": 1365,
            }
        ],
    }


# -- depot R2 -----------------------------------------------------------------
@pytest.fixture
def r2(config, monkeypatch):
    """Un vrai serveur S3 local (moto), donc le vrai protocole."""
    from moto.server import ThreadedMotoServer

    monkeypatch.setenv("no_proxy", "*")
    monkeypatch.setenv("NO_PROXY", "*")
    serveur = ThreadedMotoServer(port=port_libre(), verbose=False)
    serveur.start()
    hote, port = serveur.get_host_and_port()
    configuration = dataclasses.replace(
        config,
        storage_backend="r2",
        r2_endpoint=f"http://{hote}:{port}",
        r2_access_key_id="cle-de-test",
        r2_secret_access_key="secret-de-test",
    )
    stockage = R2Storage(configuration)
    # R2 travaille en region "auto" ; moto veut une region AWS valide pour
    # creer le bucket, on le cree donc avec un client dedie.
    import boto3

    boto3.client(
        "s3",
        endpoint_url=configuration.r2_endpoint,
        aws_access_key_id="cle-de-test",
        aws_secret_access_key="secret-de-test",
        region_name="us-east-1",
    ).create_bucket(Bucket=configuration.previews_bucket)
    yield configuration, stockage
    serveur.stop()


def test_depot_r2(r2, tmp_path):
    configuration, stockage = r2
    source = make_photo(tmp_path / "DSC01234_p.jpg", datetime(2026, 10, 15, 10, 32), seed=1)
    cle = "2026-10-15/K7M2QP/DSC01234_p.jpg"

    assert stockage.exists(configuration.previews_bucket, cle) is False
    stockage.put(source, configuration.previews_bucket, cle)
    assert stockage.exists(configuration.previews_bucket, cle) is True

    objet = stockage.client.get_object(Bucket=configuration.previews_bucket, Key=cle)
    assert objet["Body"].read() == source.read_bytes()
    assert objet["ContentType"] == "image/jpeg"


def test_depot_r2_rejouable(r2, tmp_path):
    configuration, stockage = r2
    source = make_photo(tmp_path / "DSC01235_p.jpg", datetime(2026, 10, 15, 10, 33), seed=2)
    cle = "2026-10-15/K7M2QP/DSC01235_p.jpg"
    stockage.put(source, configuration.previews_bucket, cle)
    stockage.put(source, configuration.previews_bucket, cle)
    objets = stockage.client.list_objects_v2(
        Bucket=configuration.previews_bucket, Prefix=cle
    )
    assert objets["KeyCount"] == 1  # une cle, pas deux versions cote a cote


def test_depot_r2_bucket_absent_remonte_une_erreur(r2, tmp_path):
    from bridge.uploader import StorageError

    configuration, stockage = r2
    source = make_photo(tmp_path / "DSC01236_p.jpg", seed=3)
    with pytest.raises(StorageError):
        stockage.put(source, "bucket-inexistant", "x.jpg")


# -- appel a /api/ingest ------------------------------------------------------
class FauxIngest:
    """Serveur local qui verifie la signature comme le fait la Function."""

    def __init__(self, statut: int = 200) -> None:
        self.statut = statut
        self.recu: list[dict] = []
        self.signatures_valides: list[bool] = []
        service = self

        class Handler(BaseHTTPRequestHandler):
            protocol_version = "HTTP/1.1"

            def do_POST(self) -> None:  # noqa: N802
                corps = self.rfile.read(int(self.headers.get("Content-Length") or 0))
                try:
                    verify(
                        SECRET,
                        corps,
                        self.headers.get(TIMESTAMP_HEADER),
                        self.headers.get(SIGNATURE_HEADER),
                    )
                    service.signatures_valides.append(True)
                except SignatureError:
                    service.signatures_valides.append(False)
                    self.send_response(401)
                    self.send_header("Content-Length", "0")
                    self.end_headers()
                    return

                service.recu.append(json.loads(corps))
                reponse = json.dumps({"inserted": 1, "skipped": 0}).encode()
                self.send_response(service.statut)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(reponse)))
                self.end_headers()
                self.wfile.write(reponse)

            def log_message(self, *_args) -> None:
                pass

        self.server = ThreadingHTTPServer(("127.0.0.1", port_libre()), Handler)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()

    @property
    def url(self) -> str:
        return f"http://127.0.0.1:{self.server.server_port}/api/ingest"

    def stop(self) -> None:
        self.server.shutdown()
        self.server.server_close()


@pytest.fixture
def ingest():
    service = FauxIngest()
    yield service
    service.stop()


def test_appel_signe_et_charge_utile(config, ingest, session, photo, monkeypatch):
    monkeypatch.setenv("no_proxy", "*")
    configuration = dataclasses.replace(
        config, registrar_backend="api", ingest_url=ingest.url, shared_secret=SECRET
    )
    ApiRegistrar(configuration).register(session, [photo])

    assert ingest.signatures_valides == [True]
    assert ingest.recu == [build_payload(session, [photo])]


def test_erreur_http_remonte(config, session, photo, monkeypatch):
    monkeypatch.setenv("no_proxy", "*")
    service = FauxIngest(statut=500)
    try:
        configuration = dataclasses.replace(
            config, registrar_backend="api", ingest_url=service.url, shared_secret=SECRET
        )
        with pytest.raises(RegistrarError, match="500"):
            ApiRegistrar(configuration).register(session, [photo])
    finally:
        service.stop()


def test_api_injoignable_remonte(config, session, photo, monkeypatch):
    monkeypatch.setenv("no_proxy", "*")
    configuration = dataclasses.replace(
        config,
        registrar_backend="api",
        ingest_url=f"http://127.0.0.1:{port_libre()}/api/ingest",
        shared_secret=SECRET,
    )
    with pytest.raises(RegistrarError, match="injoignable"):
        ApiRegistrar(configuration).register(session, [photo])


def test_fabriques(config):
    assert isinstance(create_storage(config), LocalStorage)
    assert type(create_registrar(config)).__name__ == "NullRegistrar"
