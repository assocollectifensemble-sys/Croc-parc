"""Configuration du pont : source unique de verite.

Toutes les valeurs de reglage du pont passent par ici. Aucun autre module ne lit
l'environnement ni ne code une valeur en dur. La configuration est lue une fois
au demarrage, puis passee explicitement aux composants qui en ont besoin.
"""

from __future__ import annotations

import os
import re
from dataclasses import dataclass
from datetime import timedelta, timezone
from pathlib import Path

from .models import Watermark

TZ_OFFSET_RE = re.compile(r"^([+-])(\d{2}):?(\d{2})$")


class ConfigError(RuntimeError):
    """Configuration absente ou invalide : le pont refuse de demarrer."""


def load_dotenv(path: Path) -> dict[str, str]:
    """Lit un fichier .env sans dependance externe.

    Les variables deja definies dans l'environnement du systeme gagnent : le
    .env sert de valeurs par defaut, pas d'ecrasement.
    """
    loaded: dict[str, str] = {}
    if not path.is_file():
        return loaded
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("export "):
            line = line[len("export ") :].strip()
        key, sep, value = line.partition("=")
        if not sep:
            continue
        key = key.strip()
        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
            value = value[1:-1]
        loaded[key] = value
        os.environ.setdefault(key, value)
    return loaded


def _get(name: str, default: str | None = None) -> str | None:
    value = os.environ.get(name)
    if value is None or value == "":
        return default
    return value


def _get_path(name: str, default: Path, base: Path) -> Path:
    raw = _get(name)
    if raw is None:
        return default
    candidate = Path(raw).expanduser()
    return candidate if candidate.is_absolute() else (base / candidate).resolve()


def _get_float(name: str, default: float) -> float:
    raw = _get(name)
    if raw is None:
        return default
    try:
        return float(raw)
    except ValueError as exc:  # pragma: no cover - message d'erreur explicite
        raise ConfigError(f"{name} doit etre un nombre, recu {raw!r}") from exc


def _get_int(name: str, default: int) -> int:
    raw = _get(name)
    if raw is None:
        return default
    try:
        return int(raw)
    except ValueError as exc:  # pragma: no cover - message d'erreur explicite
        raise ConfigError(f"{name} doit etre un entier, recu {raw!r}") from exc


def parse_tz_offset(raw: str) -> timezone:
    match = TZ_OFFSET_RE.match(raw.strip())
    if not match:
        raise ConfigError(
            f"BRIDGE_TZ_OFFSET doit ressembler a +04:00, recu {raw!r}"
        )
    sign, hours, minutes = match.groups()
    delta = timedelta(hours=int(hours), minutes=int(minutes))
    return timezone(-delta if sign == "-" else delta)


@dataclass(frozen=True)
class Config:
    # Dossiers
    watch_dir: Path
    data_dir: Path
    db_path: Path
    work_dir: Path
    originals_dir: Path
    output_dir: Path
    log_dir: Path

    # Detection de fichier stable / boucle de travail
    stable_seconds: float
    poll_interval: float
    rescan_interval: float
    extensions: tuple[str, ...]
    watch_retention_days: int
    assign_grace_seconds: float
    purge_interval: float

    # Reprise sur erreur
    base_backoff: float
    max_backoff: float
    max_attempts: int

    # Images
    preview_max_edge: int
    preview_quality: int
    thumb_max_edge: int
    thumb_quality: int
    watermark_text: str
    watermark_opacity: float
    watermark_scale: float
    watermark_spacing: float
    watermark_font: Path | None
    qr_scan_max_edge: int

    # Sessions
    gallery_base_url: str
    session_ttl_days: int
    tz: timezone
    cards_inventory_csv: Path | None

    # Sortie
    storage_backend: str
    registrar_backend: str
    previews_bucket: str
    originals_bucket: str

    # Liaison avec les Functions Cloudflare
    shared_secret: str
    ingest_url: str
    r2_endpoint: str
    r2_access_key_id: str
    r2_secret_access_key: str
    fetch_host: str
    fetch_port: int
    http_timeout: float

    # Supervision
    health_host: str
    health_port: int
    log_level: str
    log_max_bytes: int
    log_backups: int

    @classmethod
    def from_env(cls, env_file: Path | None = None, base_dir: Path | None = None) -> "Config":
        base = (base_dir or Path.cwd()).resolve()
        if env_file is not None:
            load_dotenv(env_file)

        raw_watch = _get("WATCH_DIR")
        if raw_watch is None:
            raise ConfigError(
                "WATCH_DIR est obligatoire : c'est le dossier ou le FTP "
                "de l'appareil depose les JPEG."
            )
        watch = Path(raw_watch).expanduser()
        watch = watch if watch.is_absolute() else (base / watch).resolve()

        data_dir = _get_path("BRIDGE_DATA_DIR", base / "data", base)
        watermark_font_raw = _get("WATERMARK_FONT")
        inventory_raw = _get("CARDS_INVENTORY_CSV")

        storage_backend = _get("BRIDGE_STORAGE_BACKEND", "local").lower()
        if storage_backend not in {"local", "r2"}:
            raise ConfigError(
                f"BRIDGE_STORAGE_BACKEND doit valoir local ou r2, recu {storage_backend!r}"
            )
        registrar_backend = _get("BRIDGE_REGISTRAR_BACKEND", "none").lower()
        if registrar_backend not in {"none", "api"}:
            raise ConfigError(
                f"BRIDGE_REGISTRAR_BACKEND doit valoir none ou api, recu {registrar_backend!r}"
            )

        secret = _get("BRIDGE_SHARED_SECRET", "")
        if storage_backend == "r2" and not all(
            (_get("R2_ENDPOINT"), _get("R2_ACCESS_KEY_ID"), _get("R2_SECRET_ACCESS_KEY"))
        ):
            raise ConfigError(
                "BRIDGE_STORAGE_BACKEND=r2 exige R2_ENDPOINT, R2_ACCESS_KEY_ID et "
                "R2_SECRET_ACCESS_KEY"
            )
        if registrar_backend == "api" and not (secret and _get("BRIDGE_INGEST_URL")):
            raise ConfigError(
                "BRIDGE_REGISTRAR_BACKEND=api exige BRIDGE_INGEST_URL et "
                "BRIDGE_SHARED_SECRET"
            )
        if secret and len(secret) < 32:
            raise ConfigError(
                "BRIDGE_SHARED_SECRET doit faire au moins 32 caracteres "
                "(openssl rand -hex 32)"
            )

        extensions = tuple(
            ext if ext.startswith(".") else f".{ext}"
            for ext in (
                part.strip().lower()
                for part in _get("BRIDGE_EXTENSIONS", ".jpg,.jpeg").split(",")
            )
            if ext
        )
        if not extensions:
            raise ConfigError("BRIDGE_EXTENSIONS ne peut pas etre vide")

        opacity = _get_float("WATERMARK_OPACITY", 0.65)
        if not 0.0 < opacity <= 1.0:
            raise ConfigError(
                f"WATERMARK_OPACITY doit etre dans ]0, 1], recu {opacity}"
            )

        gallery_base_url = _get("GALLERY_BASE_URL", "https://photos.crocparc.re/g/")
        if not gallery_base_url.endswith("/"):
            gallery_base_url += "/"

        return cls(
            watch_dir=watch,
            data_dir=data_dir,
            db_path=_get_path("BRIDGE_DB_PATH", data_dir / "bridge.db", base),
            work_dir=_get_path("BRIDGE_WORK_DIR", data_dir / "work", base),
            originals_dir=_get_path("ORIGINALS_DIR", data_dir / "originals", base),
            output_dir=_get_path("BRIDGE_OUTPUT_DIR", data_dir / "out", base),
            log_dir=_get_path("BRIDGE_LOG_DIR", data_dir / "logs", base),
            stable_seconds=_get_float("BRIDGE_STABLE_SECONDS", 2.0),
            poll_interval=_get_float("BRIDGE_POLL_INTERVAL", 1.0),
            rescan_interval=_get_float("BRIDGE_RESCAN_INTERVAL", 30.0),
            extensions=extensions,
            watch_retention_days=_get_int("WATCH_RETENTION_DAYS", 15),
            assign_grace_seconds=_get_float("BRIDGE_ASSIGN_GRACE_SECONDS", 120.0),
            purge_interval=_get_float("BRIDGE_PURGE_INTERVAL", 3600.0),
            base_backoff=_get_float("BRIDGE_BASE_BACKOFF", 5.0),
            max_backoff=_get_float("BRIDGE_MAX_BACKOFF", 300.0),
            max_attempts=_get_int("BRIDGE_MAX_ATTEMPTS", 10),
            preview_max_edge=_get_int("PREVIEW_MAX_EDGE", 2048),
            preview_quality=_get_int("PREVIEW_QUALITY", 82),
            thumb_max_edge=_get_int("THUMB_MAX_EDGE", 512),
            thumb_quality=_get_int("THUMB_QUALITY", 75),
            watermark_text=_get("WATERMARK_TEXT", "CROC PARC"),
            watermark_opacity=opacity,
            watermark_scale=_get_float("WATERMARK_SCALE", 0.06),
            watermark_spacing=_get_float("WATERMARK_SPACING", 0.85),
            watermark_font=Path(watermark_font_raw).expanduser() if watermark_font_raw else None,
            qr_scan_max_edge=_get_int("QR_SCAN_MAX_EDGE", 1024),
            gallery_base_url=gallery_base_url,
            session_ttl_days=_get_int("SESSION_TTL_DAYS", 30),
            tz=parse_tz_offset(_get("BRIDGE_TZ_OFFSET", "+04:00")),
            cards_inventory_csv=Path(inventory_raw).expanduser() if inventory_raw else None,
            storage_backend=storage_backend,
            registrar_backend=registrar_backend,
            previews_bucket=_get("BRIDGE_PREVIEWS_BUCKET", "crocparc-previews"),
            originals_bucket=_get("BRIDGE_ORIGINALS_BUCKET", "crocparc-originals"),
            shared_secret=_get("BRIDGE_SHARED_SECRET", ""),
            ingest_url=_get("BRIDGE_INGEST_URL", ""),
            r2_endpoint=_get("R2_ENDPOINT", ""),
            r2_access_key_id=_get("R2_ACCESS_KEY_ID", ""),
            r2_secret_access_key=_get("R2_SECRET_ACCESS_KEY", ""),
            fetch_host=_get("BRIDGE_FETCH_HOST", "127.0.0.1"),
            fetch_port=_get_int("BRIDGE_FETCH_PORT", 8788),
            http_timeout=_get_float("BRIDGE_HTTP_TIMEOUT", 30.0),
            health_host=_get("BRIDGE_HEALTH_HOST", "127.0.0.1"),
            health_port=_get_int("BRIDGE_HEALTH_PORT", 8787),
            log_level=_get("BRIDGE_LOG_LEVEL", "info").lower(),
            log_max_bytes=_get_int("BRIDGE_LOG_MAX_BYTES", 5 * 1024 * 1024),
            log_backups=_get_int("BRIDGE_LOG_BACKUPS", 5),
        )

    @property
    def watermark(self) -> Watermark:
        """Reglage du filigrane, assemble une fois pour tous les appels."""
        return Watermark(
            text=self.watermark_text,
            opacity=self.watermark_opacity,
            scale=self.watermark_scale,
            spacing=self.watermark_spacing,
            font_path=self.watermark_font,
        )

    def ensure_dirs(self) -> None:
        for directory in (
            self.watch_dir,
            self.data_dir,
            self.db_path.parent,
            self.work_dir,
            self.originals_dir,
            self.output_dir,
            self.log_dir,
        ):
            directory.mkdir(parents=True, exist_ok=True)
