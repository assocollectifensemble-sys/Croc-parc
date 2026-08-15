"""Compteurs de supervision et verrou d'instance unique."""

from __future__ import annotations

import dataclasses
import json
import socket
import urllib.request

import pytest

from bridge.health import AlreadyRunning, HealthServer, snapshot
from bridge.models import FileState


def port_libre() -> int:
    with socket.socket() as sonde:
        sonde.bind(("127.0.0.1", 0))
        return sonde.getsockname()[1]


def test_instantane_compte_les_etats(config, queue, tmp_path):
    chemin = tmp_path / "DSC00001.JPG"
    chemin.write_bytes(b"x")
    queue.discover(chemin, 1, 0.0)
    queue.get_or_create_session("K7M2QP", "2026-10-15", ttl_days=30)

    etat = snapshot(queue, started_at=0.0)
    assert etat["pending"] == 1
    assert etat["done"] == 0
    assert etat["by_state"] == {FileState.DISCOVERED.value: 1}
    assert etat["status"] == "ok"


def test_statut_degrade_si_quarantaine(config, queue, tmp_path):
    chemin = tmp_path / "DSC00002.JPG"
    chemin.write_bytes(b"x")
    queue.discover(chemin, 1, 0.0)
    queue.update(chemin, state=FileState.FAILED)
    assert snapshot(queue, started_at=0.0)["status"] == "degraded"


def test_endpoint_http(config, queue):
    configuration = dataclasses.replace(config, health_port=port_libre())
    serveur = HealthServer(configuration, queue)
    serveur.start()
    try:
        url = f"http://{configuration.health_host}:{configuration.health_port}/health"
        with urllib.request.urlopen(url, timeout=5) as reponse:
            charge = json.loads(reponse.read())
        assert charge["status"] == "ok"
        assert "pending" in charge and "sessions_today" in charge

        # Le port de sante fait office de verrou : pas de second pont.
        with pytest.raises(AlreadyRunning):
            HealthServer(configuration, queue).start()
    finally:
        serveur.stop()
