"""File d'attente persistante (SQLite).

Le pont ne garde rien en memoire : etat des fichiers, sessions et incidents
vivent dans une base SQLite locale. Un redemarrage reprend exactement ou la file
en etait, une coupure reseau de plusieurs heures se rattrape toute seule.
"""

from __future__ import annotations

import logging
import os
import secrets
import sqlite3
import threading
import uuid
from datetime import date, datetime, timedelta
from pathlib import Path

from .models import Counters, FileRow, FileState, SessionRow, SessionStatus

log = logging.getLogger(__name__)

SCHEMA = """
CREATE TABLE IF NOT EXISTS files (
  path            TEXT PRIMARY KEY,
  filename        TEXT NOT NULL,
  state           TEXT NOT NULL,
  size            INTEGER,
  last_size       INTEGER,
  stable_since    REAL,
  is_card         INTEGER NOT NULL DEFAULT 0,
  code            TEXT,
  card_number     INTEGER,
  shot_at         TEXT,
  width           INTEGER,
  height          INTEGER,
  session_id      TEXT,
  preview_key     TEXT,
  thumb_key       TEXT,
  original_path    TEXT,
  sha1            TEXT,
  declared        INTEGER NOT NULL DEFAULT 0,
  attempts        INTEGER NOT NULL DEFAULT 0,
  next_attempt_at REAL NOT NULL DEFAULT 0,
  last_error      TEXT,
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_files_state ON files(state, next_attempt_at);
CREATE INDEX IF NOT EXISTS idx_files_cards ON files(is_card, shot_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_files_session_filename
  ON files(session_id, filename) WHERE session_id IS NOT NULL AND is_card = 0;

CREATE TABLE IF NOT EXISTS sessions (
  id           TEXT PRIMARY KEY,
  code         TEXT NOT NULL,
  card_number  INTEGER,
  session_date TEXT NOT NULL,
  created_at   TEXT NOT NULL,
  expires_at   TEXT NOT NULL,
  photo_count  INTEGER NOT NULL DEFAULT 0,
  status       TEXT NOT NULL DEFAULT 'active',
  opened_at    TEXT,
  registered   INTEGER NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_sessions_code_date
  ON sessions(code, session_date);

CREATE TABLE IF NOT EXISTS meta (
  cle    TEXT PRIMARY KEY,
  valeur TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS events (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL,
  day        TEXT NOT NULL,
  kind       TEXT NOT NULL,
  path       TEXT,
  message    TEXT
);
CREATE INDEX IF NOT EXISTS idx_events_day ON events(day, kind);
"""


def path_key(path: Path) -> str:
    """Cle stable d'un fichier dans la file.

    Windows est insensible a la casse et melange les separateurs : le meme
    fichier peut arriver en `C:\\crocparc\\ftp-in\\DSC1.JPG` par watchdog et en
    `c:/crocparc/ftp-in/DSC1.JPG` par le balayage. Sans normalisation, deux
    lignes pour un seul fichier -- donc un doublon.
    """
    return os.path.normcase(os.path.abspath(str(path)))


def utcnow_iso() -> str:
    return datetime.now(tz=None).astimezone().isoformat(timespec="seconds")


class Queue:
    """Acces SQLite, une connexion par thread."""

    def __init__(self, db_path: Path) -> None:
        self.db_path = db_path
        self._local = threading.local()
        self._write_lock = threading.Lock()

    # -- connexion ----------------------------------------------------------
    @property
    def conn(self) -> sqlite3.Connection:
        connection = getattr(self._local, "conn", None)
        if connection is None:
            self.db_path.parent.mkdir(parents=True, exist_ok=True)
            connection = sqlite3.connect(self.db_path, timeout=30.0)
            connection.row_factory = sqlite3.Row
            connection.execute("PRAGMA journal_mode=WAL")
            connection.execute("PRAGMA synchronous=NORMAL")
            connection.execute("PRAGMA busy_timeout=30000")
            connection.execute("PRAGMA foreign_keys=ON")
            self._local.conn = connection
        return connection

    def migrate(self) -> None:
        with self._write_lock:
            self.conn.executescript(SCHEMA)
            self.conn.commit()
        self.key_salt()

    def key_salt(self) -> str:
        """Sel des cles de stockage, tire une fois pour toutes.

        Les cles R2 doivent etre indevinables : le bucket des previews est
        public, et une cle derivee de la date et du code s'enumere. Le sel rend
        la derivation opaque tout en restant deterministe, ce qui garde le
        rejeu idempotent. Il vit dans bridge.db -- a sauvegarder avec le reste.
        """
        with self._write_lock:
            ligne = self.conn.execute(
                "SELECT valeur FROM meta WHERE cle = 'key_salt'"
            ).fetchone()
            if ligne is not None:
                return ligne["valeur"]
            sel = secrets.token_hex(32)
            self.conn.execute(
                "INSERT INTO meta (cle, valeur) VALUES ('key_salt', ?)", (sel,)
            )
            self.conn.commit()
        log.info("sel des cles de stockage cree")
        return sel

    def close(self) -> None:
        connection = getattr(self._local, "conn", None)
        if connection is not None:
            connection.close()
            self._local.conn = None

    # -- decouverte ---------------------------------------------------------
    def discover(self, path: Path, size: int, mtime: float) -> bool:
        """Enregistre un fichier vu dans l'inbox.

        Retourne True si la ligne a ete creee ou reinitialisee. Un fichier deja
        connu et inchange n'est pas touche : c'est ce qui garantit qu'un
        redemarrage ou un rebalayage ne cree pas de doublon.
        """
        now = utcnow_iso()
        key = path_key(path)
        with self._write_lock:
            row = self.conn.execute(
                "SELECT state, size FROM files WHERE path = ?", (key,)
            ).fetchone()
            if row is None:
                self.conn.execute(
                    """
                    INSERT INTO files (path, filename, state, size, last_size,
                                       stable_since, created_at, updated_at)
                    VALUES (?, ?, ?, ?, NULL, NULL, ?, ?)
                    """,
                    (key, path.name, FileState.DISCOVERED, size, now, now),
                )
                self.conn.commit()
                return True
            # Le FTP a reecrit un fichier deja traite, ou la photographe a
            # renvoye un fichier reste en quarantaine : dans les deux cas il
            # doit repartir dans la file, sans intervention sur le mini-PC.
            if row["state"] in (FileState.DONE, FileState.FAILED) and row["size"] != size:
                self.conn.execute(
                    """
                    UPDATE files
                       SET state = ?, size = ?, last_size = NULL, stable_since = NULL,
                           attempts = 0, next_attempt_at = 0, last_error = NULL,
                           updated_at = ?
                     WHERE path = ?
                    """,
                    (FileState.DISCOVERED, size, now, key),
                )
                self.conn.commit()
                return True
            return False

    # -- lecture ------------------------------------------------------------
    def ready(self, states: tuple[FileState, ...], now: float) -> list[FileRow]:
        """Fichiers a traiter dont le backoff est ecoule (`now` = time.time())."""
        placeholders = ",".join("?" for _ in states)
        rows = self.conn.execute(
            f"""
            SELECT * FROM files
             WHERE state IN ({placeholders}) AND next_attempt_at <= ?
             ORDER BY COALESCE(shot_at, ''), filename
            """,
            (*[state.value for state in states], now),
        ).fetchall()
        return [FileRow.from_sqlite(row) for row in rows]

    def get(self, path: Path) -> FileRow | None:
        row = self.conn.execute(
            "SELECT * FROM files WHERE path = ?", (path_key(path),)
        ).fetchone()
        return FileRow.from_sqlite(row) if row else None

    def counters(self, day: str | None = None) -> Counters:
        day = day or date.today().isoformat()
        by_state = {
            row["state"]: row["count"]
            for row in self.conn.execute(
                "SELECT state, COUNT(*) AS count FROM files GROUP BY state"
            )
        }
        sessions_today = self.conn.execute(
            "SELECT COUNT(*) FROM sessions WHERE session_date = ?", (day,)
        ).fetchone()[0]
        photos_today = self.conn.execute(
            """
            SELECT COUNT(*) FROM files
             WHERE is_card = 0 AND session_id IS NOT NULL
               AND substr(COALESCE(shot_at, created_at), 1, 10) = ?
            """,
            (day,),
        ).fetchone()[0]
        qr_failures = self.conn.execute(
            "SELECT COUNT(*) FROM events WHERE day = ? AND kind = 'qr_invalid'",
            (day,),
        ).fetchone()[0]
        return Counters(
            by_state=by_state,
            sessions_today=sessions_today,
            photos_today=photos_today,
            qr_failures_today=qr_failures,
        )

    # -- ecriture -----------------------------------------------------------
    def update(self, path: Path, **fields) -> None:
        if not fields:
            return
        fields["updated_at"] = utcnow_iso()
        assignments = ", ".join(f"{name} = ?" for name in fields)
        values = [
            value.value if isinstance(value, (FileState, SessionStatus)) else value
            for value in fields.values()
        ]
        with self._write_lock:
            self.conn.execute(
                f"UPDATE files SET {assignments} WHERE path = ?", (*values, path_key(path))
            )
            self.conn.commit()

    def fail(
        self,
        path: Path,
        error: str,
        now: float,
        base_backoff: float,
        max_backoff: float,
        max_attempts: int,
    ) -> int:
        """Compte l'echec et reporte la prochaine tentative (backoff exponentiel)."""
        with self._write_lock:
            row = self.conn.execute(
                "SELECT attempts FROM files WHERE path = ?", (path_key(path),)
            ).fetchone()
            attempts = (row["attempts"] if row else 0) + 1
            delay = min(base_backoff * (2 ** (attempts - 1)), max_backoff)
            quarantined = 0 < max_attempts <= attempts
            self.conn.execute(
                """
                UPDATE files
                   SET attempts = ?, next_attempt_at = ?, last_error = ?,
                       state = CASE WHEN ? THEN ? ELSE state END, updated_at = ?
                 WHERE path = ?
                """,
                (
                    attempts,
                    now + delay,
                    error[:500],
                    quarantined,
                    FileState.FAILED.value,
                    utcnow_iso(),
                    path_key(path),
                ),
            )
            self.conn.commit()
        return attempts

    def clear_error(self, path: Path) -> None:
        self.update(path, attempts=0, next_attempt_at=0.0, last_error=None)

    def record_event(self, kind: str, message: str, path: Path | None = None) -> None:
        with self._write_lock:
            self.conn.execute(
                "INSERT INTO events (created_at, day, kind, path, message) VALUES (?, ?, ?, ?, ?)",
                (
                    utcnow_iso(),
                    date.today().isoformat(),
                    kind,
                    path_key(path) if path else None,
                    message[:500],
                ),
            )
            self.conn.commit()

    def events(self, day: str | None = None, limit: int = 100) -> list[sqlite3.Row]:
        day = day or date.today().isoformat()
        return list(
            self.conn.execute(
                "SELECT * FROM events WHERE day = ? ORDER BY id DESC LIMIT ?",
                (day, limit),
            )
        )

    # -- sessions -----------------------------------------------------------
    def get_or_create_session(
        self,
        code: str,
        session_date: str,
        ttl_days: int,
        card_number: int | None = None,
        opened_at: str | None = None,
        status: SessionStatus = SessionStatus.ACTIVE,
    ) -> SessionRow:
        """Une session par couple (code, date).

        Une carte reutilisee le meme jour retombe sur la meme session : les
        photos s'y ajoutent. Reutilisee un autre jour, elle ouvre une session
        neuve sans toucher a l'ancienne.
        """
        with self._write_lock:
            row = self.conn.execute(
                "SELECT * FROM sessions WHERE code = ? AND session_date = ?",
                (code, session_date),
            ).fetchone()
            if row is not None:
                if card_number is not None and row["card_number"] is None:
                    self.conn.execute(
                        "UPDATE sessions SET card_number = ? WHERE id = ?",
                        (card_number, row["id"]),
                    )
                    self.conn.commit()
                    row = self.conn.execute(
                        "SELECT * FROM sessions WHERE id = ?", (row["id"],)
                    ).fetchone()
                return SessionRow.from_sqlite(row)

            created = datetime.fromisoformat(session_date)
            expires = (created + timedelta(days=ttl_days)).date().isoformat()
            session = SessionRow(
                id=str(uuid.uuid4()),
                code=code,
                card_number=card_number,
                session_date=session_date,
                created_at=utcnow_iso(),
                expires_at=expires,
                photo_count=0,
                status=status,
                opened_at=opened_at,
            )
            self.conn.execute(
                """
                INSERT INTO sessions (id, code, card_number, session_date, created_at,
                                      expires_at, photo_count, status, opened_at, registered)
                VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, 0)
                """,
                (
                    session.id,
                    session.code,
                    session.card_number,
                    session.session_date,
                    session.created_at,
                    session.expires_at,
                    session.status.value,
                    session.opened_at,
                ),
            )
            self.conn.commit()
        log.info(
            "session ouverte",
            extra={"code": code, "session_date": session_date, "session_id": session.id},
        )
        return session

    def session(self, session_id: str) -> SessionRow | None:
        row = self.conn.execute(
            "SELECT * FROM sessions WHERE id = ?", (session_id,)
        ).fetchone()
        return SessionRow.from_sqlite(row) if row else None

    def sessions_for_day(self, day: str) -> list[SessionRow]:
        return [
            SessionRow.from_sqlite(row)
            for row in self.conn.execute(
                "SELECT * FROM sessions WHERE session_date = ? ORDER BY created_at",
                (day,),
            )
        ]

    def refresh_photo_count(self, session_id: str) -> int:
        with self._write_lock:
            count = self.conn.execute(
                """
                SELECT COUNT(*) FROM files
                 WHERE session_id = ? AND is_card = 0 AND state IN (?, ?, ?)
                """,
                (
                    session_id,
                    FileState.UPLOADED.value,
                    FileState.REGISTERED.value,
                    FileState.DONE.value,
                ),
            ).fetchone()[0]
            self.conn.execute(
                "UPDATE sessions SET photo_count = ? WHERE id = ?", (count, session_id)
            )
            self.conn.commit()
        return count

    def card_session_at(self, shot_at: str) -> tuple[str | None, str] | None:
        """Derniere carte photographiee avant `shot_at`, et sa session.

        Restreint au meme jour : une carte de la veille n'attrape pas les photos
        du lendemain matin.

        Une carte mise en quarantaine (remise en circulation trop tot) reste une
        frontiere : elle est retournee avec une session vide, pour que les
        photos qui la suivent partent en session orpheline plutot que de
        rejoindre le groupe precedent.
        """
        row = self.conn.execute(
            """
            SELECT session_id, shot_at FROM files
             WHERE is_card = 1 AND shot_at IS NOT NULL
               AND substr(shot_at, 1, 10) = substr(?, 1, 10)
               AND shot_at <= ?
             ORDER BY shot_at DESC LIMIT 1
            """,
            (shot_at, shot_at),
        ).fetchone()
        return (row["session_id"], row["shot_at"]) if row else None

    def session_encore_vivante(self, code: str, session_date: str) -> SessionRow | None:
        """Session d'un autre jour, pour ce code, dont la galerie n'a pas expire.

        Une carte remise en circulation trop tot est le seul chemin connu par
        lequel une famille pourrait voir les photos d'une autre : le code est le
        seul identifiant que le visiteur possede, donc deux sessions vivantes
        sous le meme code sont indemelables.
        """
        row = self.conn.execute(
            """
            SELECT * FROM sessions
             WHERE code = ? AND session_date != ? AND status = 'active'
               AND expires_at >= ?
             ORDER BY session_date DESC LIMIT 1
            """,
            (code, session_date, session_date),
        ).fetchone()
        return SessionRow.from_sqlite(row) if row else None

    def other_card_shots(self, code: str, day: str, exclude_path: Path) -> list[FileRow]:
        """Autres photos de la meme carte le meme jour : la carte a resservi."""
        rows = self.conn.execute(
            """
            SELECT * FROM files
             WHERE is_card = 1 AND code = ? AND substr(shot_at, 1, 10) = ?
               AND path != ?
             ORDER BY shot_at
            """,
            (code, day, path_key(exclude_path)),
        ).fetchall()
        return [FileRow.from_sqlite(row) for row in rows]

    def purgeable(self, before: str) -> list[FileRow]:
        """Fichiers termines dont l'original de l'inbox peut etre efface."""
        rows = self.conn.execute(
            """
            SELECT * FROM files
             WHERE state = ? AND updated_at < ?
             ORDER BY updated_at
            """,
            (FileState.DONE.value, before),
        ).fetchall()
        return [FileRow.from_sqlite(row) for row in rows]

    def photos_to_reassign(self, since_shot_at: str, session_id: str) -> list[FileRow]:
        """Photos deja rangees ailleurs qu'une carte tardive vient de reclamer."""
        rows = self.conn.execute(
            """
            SELECT * FROM files
             WHERE is_card = 0 AND session_id IS NOT NULL AND session_id != ?
               AND shot_at >= ? AND substr(shot_at, 1, 10) = substr(?, 1, 10)
            """,
            (session_id, since_shot_at, since_shot_at),
        ).fetchall()
        return [FileRow.from_sqlite(row) for row in rows]

    def filename_taken(self, session_id: str, filename: str, exclude_path: Path) -> bool:
        row = self.conn.execute(
            """
            SELECT 1 FROM files
             WHERE session_id = ? AND filename = ? AND path != ? AND is_card = 0
            """,
            (session_id, filename, path_key(exclude_path)),
        ).fetchone()
        return row is not None

    def session_photos(self, session_id: str, states: tuple[FileState, ...]) -> list[FileRow]:
        placeholders = ",".join("?" for _ in states)
        rows = self.conn.execute(
            f"""
            SELECT * FROM files
             WHERE session_id = ? AND is_card = 0 AND state IN ({placeholders})
             ORDER BY shot_at, filename
            """,
            (session_id, *[state.value for state in states]),
        ).fetchall()
        return [FileRow.from_sqlite(row) for row in rows]
