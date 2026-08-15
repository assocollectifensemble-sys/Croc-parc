"""Sorties du pont : stockage objet et enregistrement en base.

Deux interfaces, deux implementations chacune :

- `LocalStorage` ecrit dans un dossier qui imite l'arborescence R2, ce qui rend
  toute la chaine testable sans compte ; `R2Storage` parle a R2 en S3.
- `NullRegistrar` journalise ce qui serait envoye ; `ApiRegistrar` appelle
  reellement `POST /api/ingest`, signe en HMAC.

Seuls les derives (preview, vignette) montent sur R2. Les originaux du A7 IV
pesent 10 a 20 Mo : les monter systematiquement viderait le palier gratuit en
deux jours. Ils restent au parc et ne partent qu'une fois vendus, sur demande du
webhook Stripe (voir fetch_original.py).
"""

from __future__ import annotations

import json
import logging
import urllib.error
import urllib.request
from pathlib import Path
from typing import Protocol

from .config import Config
from .imaging import copy_verified, sha1_of
from .models import FileRow, SessionRow
from .signing import SIGNATURE_HEADER, TIMESTAMP_HEADER, sign

log = logging.getLogger(__name__)


class StorageError(RuntimeError):
    """Depot impossible : sera rejoue."""


class RegistrarError(RuntimeError):
    """Enregistrement impossible : sera rejoue."""


class Storage(Protocol):
    def put(self, source: Path, bucket: str, key: str) -> None: ...

    def exists(self, bucket: str, key: str) -> bool: ...


class Registrar(Protocol):
    def register(self, session: SessionRow, photos: list[FileRow]) -> None: ...


class LocalStorage:
    """Ecrit sous `<output_dir>/<bucket>/<key>` en verifiant chaque copie.

    Idempotent : reecrire la meme cle avec le meme contenu est un non-evenement.
    """

    def __init__(self, output_dir: Path) -> None:
        self.output_dir = output_dir

    def _target(self, bucket: str, key: str) -> Path:
        return self.output_dir / bucket / key

    def put(self, source: Path, bucket: str, key: str) -> None:
        target = self._target(bucket, key)
        if target.exists() and sha1_of(target) == sha1_of(source):
            return
        copy_verified(source, target)

    def exists(self, bucket: str, key: str) -> bool:
        return self._target(bucket, key).is_file()


class R2Storage:
    """Depot sur Cloudflare R2 via l'API S3.

    boto3 n'est importe qu'ici : le pont tourne sans lui tant qu'on reste en
    stockage local.
    """

    #: Types MIME par extension. R2 sert les previews directement au navigateur.
    CONTENT_TYPES = {".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png"}

    def __init__(self, config: Config) -> None:
        try:
            import boto3
            from botocore.config import Config as BotoConfig
        except ImportError as exc:  # pragma: no cover - dependance optionnelle
            raise StorageError(
                "boto3 est requis pour BRIDGE_STORAGE_BACKEND=r2 : "
                'pip install -e ".[cloud]"'
            ) from exc

        self.client = boto3.client(
            "s3",
            endpoint_url=config.r2_endpoint,
            aws_access_key_id=config.r2_access_key_id,
            aws_secret_access_key=config.r2_secret_access_key,
            region_name="auto",
            config=BotoConfig(
                retries={"max_attempts": 3, "mode": "standard"},
                connect_timeout=10,
                read_timeout=config.http_timeout,
            ),
        )

    def put(self, source: Path, bucket: str, key: str) -> None:
        content_type = self.CONTENT_TYPES.get(source.suffix.lower(), "application/octet-stream")
        try:
            with source.open("rb") as handle:
                self.client.put_object(
                    Bucket=bucket, Key=key, Body=handle, ContentType=content_type
                )
        except Exception as exc:  # botocore leve des exceptions tres variees
            raise StorageError(f"depot R2 impossible ({bucket}/{key}) : {exc}") from exc

    def exists(self, bucket: str, key: str) -> bool:
        try:
            self.client.head_object(Bucket=bucket, Key=key)
            return True
        except Exception:
            return False


class NullRegistrar:
    """Phase A : rien ne part sur le reseau, on journalise la charge utile."""

    def register(self, session: SessionRow, photos: list[FileRow]) -> None:
        log.info(
            "enregistrement simule (stockage local)",
            extra={
                "code": session.code,
                "photos": len(photos),
                "payload_bytes": len(json.dumps(build_payload(session, photos))),
            },
        )


class ApiRegistrar:
    """Appelle `POST /api/ingest`, signe en HMAC-SHA256.

    Toute erreur remonte : la file rejouera avec son backoff. C'est ce qui rend
    une coupure reseau de plusieurs heures sans consequence.
    """

    def __init__(self, config: Config) -> None:
        self.url = config.ingest_url
        self.secret = config.shared_secret
        self.timeout = config.http_timeout

    def register(self, session: SessionRow, photos: list[FileRow]) -> None:
        body = json.dumps(
            build_payload(session, photos), ensure_ascii=False, separators=(",", ":")
        ).encode("utf-8")
        timestamp, signature = sign(self.secret, body)
        request = urllib.request.Request(
            self.url,
            data=body,
            method="POST",
            headers={
                "Content-Type": "application/json",
                TIMESTAMP_HEADER: timestamp,
                SIGNATURE_HEADER: signature,
            },
        )
        try:
            with urllib.request.urlopen(request, timeout=self.timeout) as response:
                payload = json.loads(response.read() or b"{}")
        except urllib.error.HTTPError as exc:
            detail = exc.read()[:300].decode("utf-8", errors="replace")
            raise RegistrarError(f"/api/ingest a repondu {exc.code} : {detail}") from exc
        except OSError as exc:
            raise RegistrarError(f"/api/ingest injoignable : {exc}") from exc

        log.info(
            "session enregistree",
            extra={
                "code": session.code,
                "photos": len(photos),
                "inserted": payload.get("inserted"),
                "skipped": payload.get("skipped"),
            },
        )


def build_payload(session: SessionRow, photos: list[FileRow]) -> dict:
    """Charge utile de `POST /api/ingest`, seule definition du contrat cote pont."""
    return {
        "code": session.code,
        "card_number": session.card_number,
        "session_date": session.session_date,
        "photos": [
            {
                "filename": photo.filename,
                "shot_at": photo.shot_at,
                "preview_key": photo.preview_key,
                "thumb_key": photo.thumb_key,
                "original_path": photo.original_path,
                "width": photo.width,
                "height": photo.height,
            }
            for photo in photos
        ],
    }


def create_storage(config: Config) -> Storage:
    if config.storage_backend == "local":
        return LocalStorage(config.output_dir)
    return R2Storage(config)


def create_registrar(config: Config) -> Registrar:
    if config.registrar_backend == "none":
        return NullRegistrar()
    return ApiRegistrar(config)
