"""Journalisation structuree en JSON, avec rotation.

Un seul format, lisible a la machine, pour que la console d'admin et les alertes
puissent s'appuyer dessus plus tard sans reparser du texte libre.
"""

from __future__ import annotations

import json
import logging
import logging.handlers
import sys
from pathlib import Path

#: Attributs standards de LogRecord : tout le reste est du contexte metier.
_STANDARD = set(
    logging.LogRecord("", 0, "", 0, "", (), None).__dict__
) | {"message", "asctime", "taskName"}

LEVELS = {
    "debug": logging.DEBUG,
    "info": logging.INFO,
    "warning": logging.WARNING,
    "error": logging.ERROR,
}


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "ts": self.formatTime(record, "%Y-%m-%dT%H:%M:%S%z"),
            "level": record.levelname.lower(),
            "logger": record.name,
            "message": record.getMessage(),
        }
        for key, value in record.__dict__.items():
            if key not in _STANDARD:
                payload[key] = value
        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)
        return json.dumps(payload, ensure_ascii=False, default=str)


def setup_logging(log_dir: Path, level: str, max_bytes: int, backups: int) -> None:
    log_dir.mkdir(parents=True, exist_ok=True)
    root = logging.getLogger()
    root.setLevel(LEVELS.get(level, logging.INFO))
    for handler in list(root.handlers):
        root.removeHandler(handler)

    formatter = JsonFormatter()

    file_handler = logging.handlers.RotatingFileHandler(
        log_dir / "bridge.log", maxBytes=max_bytes, backupCount=backups, encoding="utf-8"
    )
    file_handler.setFormatter(formatter)
    root.addHandler(file_handler)

    console = logging.StreamHandler(sys.stderr)
    console.setFormatter(formatter)
    root.addHandler(console)

    # watchdog est bavard au niveau debug et n'apprend rien d'utile.
    logging.getLogger("watchdog").setLevel(logging.WARNING)
