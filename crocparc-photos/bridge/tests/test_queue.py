"""File SQLite : idempotence de la decouverte, backoff, sessions."""

from __future__ import annotations

from pathlib import Path

from bridge.models import FileState, SessionStatus
from bridge.queue import Queue


def touch(path: Path, content: bytes = b"x" * 10) -> tuple[int, float]:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(content)
    stat = path.stat()
    return stat.st_size, stat.st_mtime


def test_decouverte_idempotente(queue: Queue, tmp_path: Path):
    path = tmp_path / "DSC00001.JPG"
    size, mtime = touch(path)
    assert queue.discover(path, size, mtime) is True
    assert queue.discover(path, size, mtime) is False
    assert queue.discover(path, size, mtime) is False
    row = queue.get(path)
    assert row is not None and row.state is FileState.DISCOVERED


def test_fichier_reecrit_par_le_ftp_est_rejoue(queue: Queue, tmp_path: Path):
    path = tmp_path / "DSC00002.JPG"
    size, mtime = touch(path)
    queue.discover(path, size, mtime)
    queue.update(path, state=FileState.DONE)
    # Meme nom, contenu different : le boitier a reboucle son compteur.
    size, mtime = touch(path, b"y" * 50)
    assert queue.discover(path, size, mtime) is True
    assert queue.get(path).state is FileState.DISCOVERED


def test_backoff_exponentiel_plafonne(queue: Queue, tmp_path: Path):
    path = tmp_path / "DSC00003.JPG"
    size, mtime = touch(path)
    queue.discover(path, size, mtime)

    delais = []
    for tentative in range(1, 9):
        queue.fail(path, "boum", now=0.0, base_backoff=5, max_backoff=300, max_attempts=0)
        delais.append(queue.get(path).next_attempt_at)
    assert delais[:4] == [5, 10, 20, 40]
    assert max(delais) == 300  # plafonne a 5 minutes
    assert queue.get(path).state is FileState.DISCOVERED  # max_attempts=0 : jamais de quarantaine


def test_quarantaine_apres_max_attempts(queue: Queue, tmp_path: Path):
    path = tmp_path / "DSC00004.JPG"
    size, mtime = touch(path)
    queue.discover(path, size, mtime)
    for _ in range(3):
        queue.fail(path, "boum", now=0.0, base_backoff=1, max_backoff=10, max_attempts=3)
    row = queue.get(path)
    assert row.state is FileState.FAILED and row.attempts == 3
    assert "boum" in row.last_error


def test_backoff_respecte_par_ready(queue: Queue, tmp_path: Path):
    path = tmp_path / "DSC00005.JPG"
    size, mtime = touch(path)
    queue.discover(path, size, mtime)
    queue.fail(path, "boum", now=100.0, base_backoff=5, max_backoff=300, max_attempts=0)
    assert queue.ready((FileState.DISCOVERED,), now=104.0) == []
    assert len(queue.ready((FileState.DISCOVERED,), now=106.0)) == 1


def test_une_session_par_code_et_par_date(queue: Queue):
    premiere = queue.get_or_create_session("K7M2QP", "2026-10-15", ttl_days=30)
    identique = queue.get_or_create_session("K7M2QP", "2026-10-15", ttl_days=30)
    lendemain = queue.get_or_create_session("K7M2QP", "2026-10-16", ttl_days=30)
    assert premiere.id == identique.id
    assert lendemain.id != premiere.id
    assert premiere.expires_at == "2026-11-14"
    assert lendemain.expires_at == "2026-11-15"


def test_numero_de_carte_complete_a_posteriori(queue: Queue):
    queue.get_or_create_session("K7M2QP", "2026-10-15", ttl_days=30)
    session = queue.get_or_create_session("K7M2QP", "2026-10-15", ttl_days=30, card_number=427)
    assert session.card_number == 427


def test_statut_orphelin_conserve(queue: Queue):
    session = queue.get_or_create_session(
        "ORPHAN", "2026-10-15", ttl_days=30, status=SessionStatus.ORPHAN
    )
    assert queue.session(session.id).status is SessionStatus.ORPHAN


def test_journal_d_incidents(queue: Queue, tmp_path: Path):
    queue.record_event("qr_invalid", "QR lu mais code invalide", tmp_path / "DSC1.JPG")
    evenements = queue.events()
    assert len(evenements) == 1
    assert evenements[0]["kind"] == "qr_invalid"
