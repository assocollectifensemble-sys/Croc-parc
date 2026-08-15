"""Verrou d'instance unique, par fichier.

Deux ponts sur le meme dossier surveille traiteraient chaque photo deux fois :
la base SQLite serait ecrite par deux processus, `_write_lock` ne protegeant
que les threads d'un meme processus.

Le port de sante ne suffit pas comme verrou : sous Windows, SO_REUSEADDR
autorise le bind d'un port deja en ecoute. On pose donc un vrai verrou de
fichier, exclusif et libere automatiquement si le processus meurt.
"""

from __future__ import annotations

import logging
import os
from pathlib import Path

log = logging.getLogger(__name__)


class AlreadyLocked(RuntimeError):
    """Un autre pont tourne deja sur ces donnees."""


class InstanceLock:
    def __init__(self, path: Path) -> None:
        self.path = path
        self._handle = None

    def acquire(self) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        handle = self.path.open("a+")
        try:
            if os.name == "nt":  # pragma: no cover - teste sur le mini-PC
                import msvcrt

                handle.seek(0)
                msvcrt.locking(handle.fileno(), msvcrt.LK_NBLCK, 1)
            else:
                import fcntl

                fcntl.flock(handle.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
        except OSError as exc:
            handle.close()
            raise AlreadyLocked(
                f"un autre pont utilise deja {self.path.parent} "
                "(verrou pose par un processus vivant)"
            ) from exc

        handle.seek(0)
        handle.truncate()
        handle.write(str(os.getpid()))
        handle.flush()
        self._handle = handle
        log.info("verrou d'instance pose", extra={"pid": os.getpid()})

    def release(self) -> None:
        if self._handle is None:
            return
        try:
            if os.name == "nt":  # pragma: no cover - teste sur le mini-PC
                import msvcrt

                self._handle.seek(0)
                msvcrt.locking(self._handle.fileno(), msvcrt.LK_UNLCK, 1)
            else:
                import fcntl

                fcntl.flock(self._handle.fileno(), fcntl.LOCK_UN)
        except OSError:  # pragma: no cover - le fichier part de toute facon
            pass
        finally:
            self._handle.close()
            self._handle = None

    def __enter__(self) -> "InstanceLock":
        self.acquire()
        return self

    def __exit__(self, *_exc) -> None:
        self.release()
