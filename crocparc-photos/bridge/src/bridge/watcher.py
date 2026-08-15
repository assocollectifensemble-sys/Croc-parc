"""Surveillance du dossier FTP.

Deux sources d'evenements, volontairement redondantes :

- watchdog, qui reagit immediatement au depot d'un fichier ;
- un balayage complet periodique, filet de securite quand un evenement se perd
  (partage reseau, montage SMB, reveil de veille, service redemarre).

Aucun des deux ne traite quoi que ce soit : ils se contentent d'inscrire les
fichiers dans la file. Tout le travail est fait par le Processor.
"""

from __future__ import annotations

import logging
from pathlib import Path

from watchdog.events import FileSystemEvent, FileSystemEventHandler
from watchdog.observers import Observer

from .config import Config
from .queue import Queue

log = logging.getLogger(__name__)

#: Suffixes des fichiers en cours d'ecriture, a ignorer.
PARTIAL_SUFFIXES = (".part", ".tmp", ".filepart", ".crdownload")


def is_candidate(path: Path, extensions: tuple[str, ...]) -> bool:
    if not path.is_file():
        return False
    name = path.name
    if name.startswith(".") or name.startswith("~"):
        return False
    lowered = name.lower()
    if lowered.endswith(PARTIAL_SUFFIXES):
        return False
    return path.suffix.lower() in extensions


def scan_inbox(config: Config, queue: Queue) -> int:
    """Inscrit dans la file tout fichier candidat present dans l'inbox."""
    discovered = 0
    if not config.inbox_dir.is_dir():
        log.warning("inbox absente", extra={"inbox": str(config.inbox_dir)})
        return 0
    for path in sorted(config.inbox_dir.rglob("*")):
        if not is_candidate(path, config.extensions):
            continue
        try:
            stat = path.stat()
        except OSError:  # pragma: no cover - fichier disparu entre-temps
            continue
        if queue.discover(path, stat.st_size, stat.st_mtime):
            discovered += 1
    if discovered:
        log.info("nouveaux fichiers reperes", extra={"count": discovered})
    return discovered


class InboxHandler(FileSystemEventHandler):
    def __init__(self, config: Config, queue: Queue) -> None:
        self.config = config
        self.queue = queue

    def _note(self, raw_path: str) -> None:
        path = Path(raw_path)
        if not is_candidate(path, self.config.extensions):
            return
        try:
            stat = path.stat()
        except OSError:  # pragma: no cover - fichier disparu entre-temps
            return
        if self.queue.discover(path, stat.st_size, stat.st_mtime):
            log.info("fichier repere", extra={"file": path.name})

    def on_created(self, event: FileSystemEvent) -> None:
        if not event.is_directory:
            self._note(event.src_path)

    def on_modified(self, event: FileSystemEvent) -> None:
        if not event.is_directory:
            self._note(event.src_path)

    def on_moved(self, event: FileSystemEvent) -> None:
        if not event.is_directory:
            self._note(event.dest_path)


def start_observer(config: Config, queue: Queue) -> Observer:
    observer = Observer()
    observer.schedule(InboxHandler(config, queue), str(config.inbox_dir), recursive=True)
    observer.start()
    log.info("surveillance demarree", extra={"inbox": str(config.inbox_dir)})
    return observer
