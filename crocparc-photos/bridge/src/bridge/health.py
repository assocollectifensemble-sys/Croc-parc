"""Compteurs de supervision sur http://localhost:8787/health.

Volontairement minimal : pas d'authentification, pas d'ecriture, ecoute sur la
boucle locale seulement. Sert a repondre a une seule question depuis le
mini-PC : est-ce que la file avance ?
"""

from __future__ import annotations

import json
import logging
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from . import __version__
from .config import Config
from .queue import Queue

log = logging.getLogger(__name__)


class AlreadyRunning(RuntimeError):
    """Le port de sante est deja pris : un autre pont tourne."""


def snapshot(queue: Queue, started_at: float) -> dict:
    counters = queue.counters()
    return {
        "status": "ok" if counters.failed == 0 else "degraded",
        "version": __version__,
        "uptime_seconds": round(time.time() - started_at),
        "pending": counters.pending,
        "done": counters.done,
        "failed": counters.failed,
        "by_state": counters.by_state,
        "sessions_today": counters.sessions_today,
        "photos_today": counters.photos_today,
        "qr_failures_today": counters.qr_failures_today,
    }


class HealthServer:
    def __init__(self, config: Config, queue: Queue) -> None:
        self.config = config
        self.queue = queue
        self.started_at = time.time()
        self._server: ThreadingHTTPServer | None = None
        self._thread: threading.Thread | None = None

    def start(self) -> None:
        health = self

        class Handler(BaseHTTPRequestHandler):
            def do_GET(self) -> None:  # noqa: N802 - impose par BaseHTTPRequestHandler
                if self.path.rstrip("/") not in ("/health", ""):
                    self.send_error(404)
                    return
                body = json.dumps(
                    snapshot(health.queue, health.started_at), ensure_ascii=False
                ).encode("utf-8")
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)

            def log_message(self, *_args) -> None:
                """Silence : les acces au /health n'ont pas d'interet dans le journal."""

        try:
            self._server = ThreadingHTTPServer(
                (self.config.health_host, self.config.health_port), Handler
            )
        except OSError as exc:
            # Le port de sante sert aussi de verrou d'instance unique : deux
            # ponts sur la meme inbox traiteraient chaque photo deux fois.
            raise AlreadyRunning(
                f"le port {self.config.health_port} est deja pris : un pont tourne "
                "sans doute deja sur cette machine"
            ) from exc
        self._thread = threading.Thread(
            target=self._server.serve_forever, name="health", daemon=True
        )
        self._thread.start()
        log.info(
            "serveur de sante demarre",
            extra={"host": self.config.health_host, "port": self.config.health_port},
        )

    def stop(self) -> None:
        if self._server is not None:
            self._server.shutdown()
            self._server.server_close()
        if self._thread is not None:
            self._thread.join(timeout=5)
