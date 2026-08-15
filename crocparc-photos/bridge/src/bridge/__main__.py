"""Point d'entree du pont.

    python -m bridge run      # service : surveille, traite, expose /health
    python -m bridge once     # traite ce qui est en attente puis rend la main
    python -m bridge status   # etat de la file, sans rien modifier
    python -m bridge retry    # sort les fichiers en quarantaine et les rejoue
    python -m bridge purge    # efface de l'inbox les originaux deja archives
"""

from __future__ import annotations

import argparse
import json
import logging
import signal
import sys
import threading
import time
from pathlib import Path

from .config import Config, ConfigError
from .health import AlreadyRunning, HealthServer, snapshot
from .logging_setup import setup_logging
from .models import FileState
from .processor import Processor
from .queue import Queue
from .uploader import create_registrar, create_storage
from .watcher import scan_inbox, start_observer

log = logging.getLogger(__name__)


def build(config: Config) -> tuple[Queue, Processor]:
    config.ensure_dirs()
    queue = Queue(config.db_path)
    queue.migrate()
    processor = Processor(config, queue, create_storage(config), create_registrar(config))
    return queue, processor


def cmd_run(config: Config) -> int:
    queue, processor = build(config)
    health = HealthServer(config, queue)
    try:
        health.start()
    except AlreadyRunning as exc:
        print(f"Demarrage refuse : {exc}", file=sys.stderr)
        queue.close()
        return 3
    observer = start_observer(config, queue)

    stop = threading.Event()

    def handle_signal(signum, _frame) -> None:
        log.info("arret demande", extra={"signal": signum})
        stop.set()

    signal.signal(signal.SIGINT, handle_signal)
    signal.signal(signal.SIGTERM, handle_signal)

    scan_inbox(config, queue)
    last_scan = last_purge = time.time()
    log.info(
        "pont demarre",
        extra={
            "inbox": str(config.inbox_dir),
            "retention_days": config.inbox_retention_days,
        },
    )

    try:
        while not stop.is_set():
            now = time.time()
            if now - last_scan >= config.rescan_interval:
                scan_inbox(config, queue)
                last_scan = now
            processor.tick(now=now)
            if now - last_purge >= config.purge_interval:
                processor.purge_inbox(now=now)
                last_purge = now
            stop.wait(config.poll_interval)
    finally:
        observer.stop()
        observer.join(timeout=5)
        health.stop()
        queue.close()
        log.info("pont arrete")
    return 0


def cmd_once(config: Config) -> int:
    queue, processor = build(config)
    scan_inbox(config, queue)
    # Un fichier n'est declare stable qu'apres BRIDGE_STABLE_SECONDS : en mode
    # ponctuel on attend ce delai plutot que de rendre la main trop tot.
    deadline = time.time() + config.stable_seconds + 1.0
    while time.time() < deadline:
        processor.tick()
        time.sleep(0.2)
    steps = processor.drain()
    print(json.dumps(snapshot(queue, time.time()), ensure_ascii=False, indent=2))
    queue.close()
    return 0 if steps >= 0 else 1


def cmd_purge(config: Config) -> int:
    queue, processor = build(config)
    efface = processor.purge_inbox()
    print(
        f"{efface} fichier(s) efface(s) de l'inbox "
        f"(retention : {config.inbox_retention_days} jours)"
    )
    queue.close()
    return 0


def cmd_status(config: Config) -> int:
    queue, _ = build(config)
    print(json.dumps(snapshot(queue, time.time()), ensure_ascii=False, indent=2))
    for event in queue.events():
        print(f"  {event['created_at']}  {event['kind']:<18} {event['message']}")
    queue.close()
    return 0


def cmd_retry(config: Config) -> int:
    queue, _ = build(config)
    rows = queue.ready((FileState.FAILED,), float("inf"))
    for row in rows:
        queue.update(row.path, state=FileState.DISCOVERED, attempts=0, next_attempt_at=0.0)
    print(f"{len(rows)} fichier(s) remis dans la file")
    queue.close()
    return 0


COMMANDS = {
    "run": cmd_run,
    "once": cmd_once,
    "status": cmd_status,
    "retry": cmd_retry,
    "purge": cmd_purge,
}


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="bridge", description="Pont Croc Parc Photos")
    parser.add_argument("command", choices=sorted(COMMANDS), help="action a executer")
    parser.add_argument(
        "--env", type=Path, default=Path(".env"), help="fichier .env (defaut : ./.env)"
    )
    args = parser.parse_args(argv)

    try:
        config = Config.from_env(env_file=args.env)
    except ConfigError as exc:
        print(f"Configuration invalide : {exc}", file=sys.stderr)
        return 2

    setup_logging(config.log_dir, config.log_level, config.log_max_bytes, config.log_backups)
    return COMMANDS[args.command](config)


if __name__ == "__main__":
    raise SystemExit(main())
