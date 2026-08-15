"""Types partages par le pont."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from enum import StrEnum
from pathlib import Path


class FileState(StrEnum):
    """Machine a etats d'un fichier, persistee en SQLite.

    discovered -> stable -> analyzed -> processed -> uploaded -> registered -> done

    `failed` est un cul-de-sac atteint apres BRIDGE_MAX_ATTEMPTS echecs
    consecutifs : le fichier reste visible en admin et peut etre rejoue a la main.
    """

    DISCOVERED = "discovered"
    STABLE = "stable"
    ANALYZED = "analyzed"
    PROCESSED = "processed"
    UPLOADED = "uploaded"
    REGISTERED = "registered"
    DONE = "done"
    FAILED = "failed"


#: Etats qui demandent encore du travail, dans l'ordre de traitement.
ACTIVE_STATES: tuple[FileState, ...] = (
    FileState.DISCOVERED,
    FileState.STABLE,
    FileState.ANALYZED,
    FileState.PROCESSED,
    FileState.UPLOADED,
    FileState.REGISTERED,
)


class SessionStatus(StrEnum):
    ACTIVE = "active"
    ORPHAN = "orphan"
    EXPIRED = "expired"
    PURGED = "purged"


@dataclass(frozen=True)
class Watermark:
    """Reglage du filigrane, regroupe pour ne pas trainer six arguments.

    `scale` est une fraction du bord court de l'image : le filigrane garde la
    meme presence sur une preview 2048 px et sur une vignette 512 px.
    `spacing` est l'ecart entre deux marques, en multiples de la taille du texte.
    """

    text: str
    opacity: float
    scale: float = 0.06
    spacing: float = 0.85
    font_path: Path | None = None


@dataclass(frozen=True)
class CardRef:
    """Ce qu'un QR de carte separatrice nous apprend."""

    code: str
    card_number: int | None = None
    payload: str = ""


@dataclass(frozen=True)
class ImageMetadata:
    """Metadonnees lues dans le JPEG d'origine."""

    width: int
    height: int
    shot_at: datetime | None
    has_gps: bool


@dataclass
class FileRow:
    """Une ligne de la file d'attente."""

    path: Path
    filename: str
    state: FileState
    size: int | None = None
    last_size: int | None = None
    stable_since: float | None = None
    is_card: bool = False
    code: str | None = None
    card_number: int | None = None
    shot_at: str | None = None
    width: int | None = None
    height: int | None = None
    session_id: str | None = None
    preview_key: str | None = None
    thumb_key: str | None = None
    original_path: str | None = None
    sha1: str | None = None
    declared: bool = False
    analyzed_at: float | None = None
    attempts: int = 0
    next_attempt_at: float = 0.0
    last_error: str | None = None

    @classmethod
    def from_sqlite(cls, row) -> "FileRow":
        return cls(
            path=Path(row["path"]),
            filename=row["filename"],
            state=FileState(row["state"]),
            size=row["size"],
            last_size=row["last_size"],
            stable_since=row["stable_since"],
            is_card=bool(row["is_card"]),
            code=row["code"],
            card_number=row["card_number"],
            shot_at=row["shot_at"],
            width=row["width"],
            height=row["height"],
            session_id=row["session_id"],
            preview_key=row["preview_key"],
            thumb_key=row["thumb_key"],
            original_path=row["original_path"],
            sha1=row["sha1"],
            declared=bool(row["declared"]),
            analyzed_at=row["analyzed_at"],
            attempts=row["attempts"],
            next_attempt_at=row["next_attempt_at"],
            last_error=row["last_error"],
        )


@dataclass
class SessionRow:
    id: str
    code: str
    card_number: int | None
    session_date: str
    created_at: str
    expires_at: str
    photo_count: int = 0
    status: SessionStatus = SessionStatus.ACTIVE
    opened_at: str | None = None
    registered: bool = False

    @classmethod
    def from_sqlite(cls, row) -> "SessionRow":
        return cls(
            id=row["id"],
            code=row["code"],
            card_number=row["card_number"],
            session_date=row["session_date"],
            created_at=row["created_at"],
            expires_at=row["expires_at"],
            photo_count=row["photo_count"],
            status=SessionStatus(row["status"]),
            opened_at=row["opened_at"],
            registered=bool(row["registered"]),
        )


@dataclass
class Counters:
    """Instantane expose sur /health."""

    by_state: dict[str, int] = field(default_factory=dict)
    sessions_today: int = 0
    photos_today: int = 0
    qr_failures_today: int = 0

    @property
    def pending(self) -> int:
        return sum(self.by_state.get(state.value, 0) for state in ACTIVE_STATES)

    @property
    def done(self) -> int:
        return self.by_state.get(FileState.DONE.value, 0)

    @property
    def failed(self) -> int:
        return self.by_state.get(FileState.FAILED.value, 0)
