"""Sorties du pont : stockage objet et enregistrement en base.

Deux interfaces, deux implementations utilisables des la phase A :

- `LocalStorage` ecrit dans un dossier local qui imite l'arborescence R2
  (`<output>/<bucket>/<cle>`), ce qui rend toute la chaine testable sans compte ;
- `NullRegistrar` ne fait aucun appel reseau et journalise ce qui serait envoye
  a `POST /api/ingest`.

Les implementations R2 et API arrivent en phase B et prendront la place de
celles-ci sans toucher au reste du pont.
"""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Protocol

from .config import Config
from .imaging import copy_verified, sha1_of
from .models import FileRow, SessionRow

log = logging.getLogger(__name__)


class Storage(Protocol):
    def put(self, source: Path, bucket: str, key: str) -> None: ...

    def exists(self, bucket: str, key: str) -> bool: ...


class Registrar(Protocol):
    def register(self, session: SessionRow, photos: list[FileRow]) -> None: ...


class LocalStorage:
    """Ecrit sous `<output_dir>/<bucket>/<key>` en verifiant chaque copie.

    Idempotent : reecrire la meme cle avec le meme contenu est un non-evenement,
    la reecrire avec un contenu different est journalise puis applique.
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


class R2Storage:  # pragma: no cover - phase B
    def __init__(self, *_args, **_kwargs) -> None:
        raise NotImplementedError(
            "Le stockage R2 arrive en phase B. Garder BRIDGE_STORAGE_BACKEND=local."
        )


class NullRegistrar:
    """Phase A : rien ne part sur le reseau, on journalise la charge utile."""

    def register(self, session: SessionRow, photos: list[FileRow]) -> None:
        payload = {
            "code": session.code,
            "card_number": session.card_number,
            "session_date": session.session_date,
            "photos": [
                {
                    "filename": photo.filename,
                    "shot_at": photo.shot_at,
                    "preview_key": photo.preview_key,
                    "thumb_key": photo.thumb_key,
                    "original_key": photo.original_key,
                    "width": photo.width,
                    "height": photo.height,
                }
                for photo in photos
            ],
        }
        log.info(
            "enregistrement simule (phase A)",
            extra={
                "code": session.code,
                "photos": len(photos),
                "payload_bytes": len(json.dumps(payload)),
            },
        )


class ApiRegistrar:  # pragma: no cover - phase B
    def __init__(self, *_args, **_kwargs) -> None:
        raise NotImplementedError(
            "L'appel a POST /api/ingest arrive en phase B. "
            "Garder BRIDGE_REGISTRAR_BACKEND=none."
        )


def create_storage(config: Config) -> Storage:
    if config.storage_backend == "local":
        return LocalStorage(config.output_dir)
    return R2Storage(config)


def create_registrar(config: Config) -> Registrar:
    if config.registrar_backend == "none":
        return NullRegistrar()
    return ApiRegistrar(config)
