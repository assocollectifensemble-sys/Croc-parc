"""Traitement image : orientation, metadonnees, previews filigranees, vignettes.

Regles :
- l'original n'est jamais reecrit (copie octet pour octet vers l'archive et R2) ;
- les derives (preview, vignette) sont enregistres sans aucun bloc EXIF, ce qui
  supprime le GPS par construction ;
- l'orientation EXIF est appliquee aux pixels pour que les derives soient droits.
"""

from __future__ import annotations

import hashlib
import logging
import shutil
from datetime import datetime
from pathlib import Path

from PIL import ExifTags, Image, ImageDraw, ImageFont, ImageOps

from .models import ImageMetadata, Watermark

log = logging.getLogger(__name__)

#: Polices essayees quand WATERMARK_FONT n'est pas renseigne.
FONT_CANDIDATES = (
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "/usr/share/fonts/TTF/DejaVuSans-Bold.ttf",
    "/Library/Fonts/Arial Bold.ttf",
    "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
    "C:/Windows/Fonts/arialbd.ttf",
    "C:/Windows/Fonts/arial.ttf",
)

EXIF_DATETIME_FORMAT = "%Y:%m:%d %H:%M:%S"


class ImageError(RuntimeError):
    """JPEG illisible ou tronque : le fichier sera rejoue plus tard."""


def sha1_of(path: Path, chunk_size: int = 1024 * 1024) -> str:
    digest = hashlib.sha1()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(chunk_size), b""):
            digest.update(chunk)
    return digest.hexdigest()


def open_oriented(path: Path) -> Image.Image:
    """Ouvre un JPEG, verifie qu'il est complet et applique l'orientation EXIF.

    Un FTP interrompu produit un JPEG tronque qui s'ouvre sans broncher mais
    explose au chargement des pixels : on force donc le chargement ici.
    """
    try:
        image = Image.open(path)
        image.load()
    except Exception as exc:  # OSError, UnidentifiedImageError, DecompressionBomb...
        raise ImageError(f"JPEG illisible ou tronque : {path.name} ({exc})") from exc
    oriented = ImageOps.exif_transpose(image)
    return oriented if oriented is not None else image


def read_metadata(path: Path, image: Image.Image | None = None) -> ImageMetadata:
    """Lit dimensions, DateTimeOriginal et presence de coordonnees GPS."""
    source = image if image is not None else open_oriented(path)
    exif = source.getexif()
    exif_ifd = exif.get_ifd(ExifTags.IFD.Exif)
    gps_ifd = exif.get_ifd(ExifTags.IFD.GPSInfo)

    raw = exif_ifd.get(ExifTags.Base.DateTimeOriginal) or exif.get(
        ExifTags.Base.DateTime
    )
    shot_at: datetime | None = None
    if isinstance(raw, str):
        try:
            shot_at = datetime.strptime(raw.strip(), EXIF_DATETIME_FORMAT)
        except ValueError:
            log.warning("DateTimeOriginal illisible", extra={"raw": raw[:40]})

    return ImageMetadata(
        width=source.width,
        height=source.height,
        shot_at=shot_at,
        has_gps=bool(gps_ifd),
    )


def _load_font(size: int, font_path: Path | None) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [str(font_path)] if font_path else []
    candidates.extend(FONT_CANDIDATES)
    for candidate in candidates:
        try:
            return ImageFont.truetype(candidate, size)
        except OSError:
            continue
    log.warning("aucune police TrueType trouvee, filigrane en police par defaut")
    return ImageFont.load_default(size=size)


def apply_watermark(image: Image.Image, style: Watermark) -> Image.Image:
    """Appose un filigrane semi-transparent en diagonale, repete sur l'image.

    Le texte est rendu une seule fois dans une petite vignette, tournee une fois,
    puis repetee en quinconce : sur le mini-PC du parc, faire tourner un calque
    de la taille de l'image coute dix fois plus cher pour le meme resultat.
    """
    if not style.text:
        return image

    base = image.convert("RGBA")
    width, height = base.size
    font_size = max(14, int(min(width, height) * style.scale))
    font = _load_font(font_size, style.font_path)
    alpha = max(1, min(255, int(255 * style.opacity)))

    measure = ImageDraw.Draw(Image.new("RGBA", (1, 1)))
    left, top, right, bottom = measure.textbbox((0, 0), style.text, font=font)
    padding = max(2, font_size // 8)
    sprite = Image.new(
        "RGBA",
        (right - left + padding * 2, bottom - top + padding * 2),
        (0, 0, 0, 0),
    )
    ImageDraw.Draw(sprite).text(
        (padding - left, padding - top),
        style.text,
        font=font,
        fill=(255, 255, 255, alpha),
        stroke_width=max(1, font_size // 24),
        stroke_fill=(0, 0, 0, alpha // 2),
    )
    sprite = sprite.rotate(30, resample=Image.Resampling.BICUBIC, expand=True)

    layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
    step_x = sprite.width + int(font_size * style.spacing)
    step_y = sprite.height + int(font_size * style.spacing)
    row = 0
    for y in range(-sprite.height, height + step_y, step_y):
        offset = (step_x // 2) if row % 2 else 0
        for x in range(-sprite.width + offset, width + step_x, step_x):
            layer.paste(sprite, (x, y), sprite)
        row += 1

    return Image.alpha_composite(base, layer).convert("RGB")


def _derive(
    image: Image.Image,
    destination: Path,
    max_edge: int,
    quality: int,
    watermark: Watermark,
) -> tuple[int, int]:
    source = image.convert("RGB")
    # On reduit, jamais on n'agrandit : un original plus petit que la cible reste
    # a sa taille plutot que d'etre interpole pour rien.
    resized = (
        ImageOps.contain(source, (max_edge, max_edge), Image.Resampling.LANCZOS)
        if max(source.size) > max_edge
        else source
    )
    stamped = apply_watermark(resized, watermark)
    destination.parent.mkdir(parents=True, exist_ok=True)
    save_kwargs = {"quality": quality, "optimize": True, "progressive": True}
    icc_profile = image.info.get("icc_profile")
    if icc_profile:
        save_kwargs["icc_profile"] = icc_profile
    # Aucun argument `exif=` : les derives partent sans metadonnees, donc sans GPS.
    stamped.save(destination, format="JPEG", **save_kwargs)
    return stamped.size


def make_preview(
    image: Image.Image,
    destination: Path,
    max_edge: int,
    quality: int,
    watermark: Watermark,
) -> tuple[int, int]:
    return _derive(image, destination, max_edge, quality, watermark)


def make_thumbnail(
    image: Image.Image,
    destination: Path,
    max_edge: int,
    quality: int,
    watermark: Watermark,
) -> tuple[int, int]:
    return _derive(image, destination, max_edge, quality, watermark)


def copy_verified(source: Path, destination: Path) -> str:
    """Copie un fichier et verifie l'empreinte SHA-1 des deux cotes.

    Une copie silencieusement tronquee sur un partage reseau est un incident
    deja vu sur ce parc : on ne fait pas confiance au code de retour seul.
    """
    destination.parent.mkdir(parents=True, exist_ok=True)
    temporary = destination.with_name(destination.name + ".part")
    shutil.copyfile(source, temporary)
    source_digest = sha1_of(source)
    copy_digest = sha1_of(temporary)
    if source_digest != copy_digest:
        temporary.unlink(missing_ok=True)
        raise ImageError(
            f"copie corrompue : {source} -> {destination} "
            f"({source_digest} != {copy_digest})"
        )
    temporary.replace(destination)
    return source_digest
