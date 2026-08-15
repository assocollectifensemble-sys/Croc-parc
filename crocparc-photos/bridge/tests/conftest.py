"""Fixtures de test : les JPEG sont fabriques par les tests eux-memes.

Aucun binaire n'est versionne dans le depot : chaque test genere les images dont
il a besoin, cartes QR comprises.
"""

from __future__ import annotations

import atexit
import random
import shutil
import tempfile
from datetime import datetime
from pathlib import Path

import pytest
import qrcode
from PIL import ExifTags, Image, ImageDraw

from bridge.config import Config
from bridge.processor import Processor
from bridge.queue import Queue
from bridge.uploader import LocalStorage, NullRegistrar

EXIF_FORMAT = "%Y:%m:%d %H:%M:%S"
GALLERY_BASE = "https://photos.crocparc.re/g/"

# Les JPEG de test sont deterministes : on ne les fabrique qu'une fois par
# execution, puis on les recopie. La suite passe de 60 a 20 secondes.
_CACHE_DIR = Path(tempfile.mkdtemp(prefix="crocparc-fixtures-"))
_CACHE: dict[str, Path] = {}
atexit.register(shutil.rmtree, _CACHE_DIR, True)


def _cached(key: str, path: Path, build) -> Path:
    """Fabrique l'image une fois, la recopie ensuite."""
    source = _CACHE.get(key)
    if source is None:
        source = _CACHE_DIR / f"{len(_CACHE)}.jpg"
        build(source)
        _CACHE[key] = source
    path.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(source, path)
    return path


def _exif_bytes(
    shot_at: datetime | None,
    orientation: int | None = None,
    gps: bool = False,
) -> bytes:
    exif = Image.Exif()
    if orientation is not None:
        exif[ExifTags.Base.Orientation] = orientation
    if shot_at is not None:
        exif.get_ifd(ExifTags.IFD.Exif)[ExifTags.Base.DateTimeOriginal] = shot_at.strftime(
            EXIF_FORMAT
        )
    if gps:
        gps_ifd = exif.get_ifd(ExifTags.IFD.GPSInfo)
        gps_ifd[ExifTags.GPS.GPSLatitudeRef] = "S"
        gps_ifd[ExifTags.GPS.GPSLatitude] = (21.0, 19.0, 12.0)
        gps_ifd[ExifTags.GPS.GPSLongitudeRef] = "E"
        gps_ifd[ExifTags.GPS.GPSLongitude] = (55.0, 28.0, 48.0)
    return exif.tobytes()


def _textured(size: tuple[int, int], seed: int) -> Image.Image:
    """Image non uniforme : un aplat se compresse trop bien pour etre realiste."""
    rng = random.Random(seed)
    image = Image.new("RGB", size, (rng.randint(60, 200), rng.randint(60, 200), 90))
    draw = ImageDraw.Draw(image)
    for _ in range(40):
        x0, y0 = rng.randint(0, size[0]), rng.randint(0, size[1])
        draw.ellipse(
            [x0, y0, x0 + rng.randint(20, 300), y0 + rng.randint(20, 300)],
            fill=(rng.randint(0, 255), rng.randint(0, 255), rng.randint(0, 255)),
        )
    return image


def make_photo(
    path: Path,
    shot_at: datetime | None = None,
    size: tuple[int, int] = (2400, 1600),
    seed: int = 0,
    orientation: int | None = None,
    gps: bool = False,
    quality: int = 88,
) -> Path:
    """Ecrit un JPEG de visiteur, avec DateTimeOriginal et sans QR."""
    def build(destination: Path) -> None:
        _textured(size, seed).save(
            destination,
            "JPEG",
            quality=quality,
            exif=_exif_bytes(shot_at, orientation, gps),
        )

    key = f"photo|{shot_at}|{size}|{seed}|{orientation}|{gps}|{quality}"
    return _cached(key, path, build)


def make_card(
    path: Path,
    code: str,
    shot_at: datetime | None = None,
    size: tuple[int, int] = (2400, 1600),
    base_url: str = GALLERY_BASE,
    card_number: int | None = None,
) -> Path:
    """Ecrit la photo d'une carte separatrice : QR de l'URL de galerie sur fond clair."""
    url = f"{base_url}{code}"
    if card_number is not None:
        url += f"?n={card_number}"

    def build(destination: Path) -> None:
        qr = qrcode.QRCode(box_size=10, border=4)
        qr.add_data(url)
        qr.make(fit=True)
        qr_image = qr.make_image(fill_color="black", back_color="white").convert("RGB")

        canvas = Image.new("RGB", size, (232, 230, 224))
        side = int(min(size) * 0.6)
        qr_image = qr_image.resize((side, side), Image.Resampling.NEAREST)
        canvas.paste(qr_image, ((size[0] - side) // 2, (size[1] - side) // 2))
        canvas.save(destination, "JPEG", quality=92, exif=_exif_bytes(shot_at))

    return _cached(f"card|{url}|{shot_at}|{size}", path, build)


@pytest.fixture
def config(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Config:
    """Configuration de phase A : tout en local, sous tmp_path."""
    for name in list(__import__("os").environ):
        if name.startswith(("BRIDGE_", "PREVIEW_", "THUMB_", "WATERMARK_", "QR_", "GALLERY_", "SESSION_", "CARDS_")):
            monkeypatch.delenv(name, raising=False)
    monkeypatch.setenv("BRIDGE_INBOX_DIR", str(tmp_path / "inbox"))
    monkeypatch.setenv("BRIDGE_DATA_DIR", str(tmp_path / "data"))
    monkeypatch.setenv("BRIDGE_STABLE_SECONDS", "2.0")
    monkeypatch.setenv("BRIDGE_TZ_OFFSET", "+04:00")
    monkeypatch.setenv("GALLERY_BASE_URL", GALLERY_BASE)
    configuration = Config.from_env(base_dir=tmp_path)
    configuration.ensure_dirs()
    return configuration


@pytest.fixture
def queue(config: Config) -> Queue:
    instance = Queue(config.db_path)
    instance.migrate()
    yield instance
    instance.close()


@pytest.fixture
def processor(config: Config, queue: Queue) -> Processor:
    return Processor(config, queue, LocalStorage(config.output_dir), NullRegistrar())
