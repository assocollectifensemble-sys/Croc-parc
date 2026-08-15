"""Previews, vignettes, EXIF et integrite des copies."""

from __future__ import annotations

import hashlib
from datetime import datetime
from pathlib import Path

import pytest
from PIL import ExifTags, Image

from bridge.models import Watermark
from bridge.imaging import (
    ImageError,
    apply_watermark,
    copy_verified,
    make_preview,
    make_thumbnail,
    open_oriented,
    read_metadata,
)
from conftest import make_photo


def md5(path: Path) -> str:
    return hashlib.md5(path.read_bytes()).hexdigest()


def test_lecture_des_metadonnees(tmp_path):
    shot_at = datetime(2026, 10, 15, 10, 32, 14)
    path = make_photo(tmp_path / "DSC01234.JPG", shot_at, size=(2400, 1600), seed=1)
    metadata = read_metadata(path)
    assert metadata.shot_at == shot_at
    assert (metadata.width, metadata.height) == (2400, 1600)
    assert metadata.has_gps is False


def test_gps_detecte_dans_l_original(tmp_path):
    path = make_photo(tmp_path / "DSC01235.JPG", datetime(2026, 10, 15, 10, 0, 0), gps=True)
    assert read_metadata(path).has_gps is True


def test_orientation_appliquee_aux_pixels(tmp_path):
    # Orientation 6 = rotation de 90 deg : le portrait doit ressortir portrait.
    path = make_photo(
        tmp_path / "DSC01236.JPG", size=(2400, 1600), orientation=6, seed=2
    )
    with open_oriented(path) as image:
        assert image.size == (1600, 2400)


def test_jpeg_tronque_refuse(tmp_path):
    path = make_photo(tmp_path / "DSC01237.JPG", seed=3)
    data = path.read_bytes()
    path.write_bytes(data[: len(data) // 2])  # le FTP a ete coupe en plein transfert
    with pytest.raises(ImageError):
        open_oriented(path)


def test_preview_bord_long_et_sans_exif(tmp_path, config):
    shot_at = datetime(2026, 10, 15, 10, 32, 14)
    source = make_photo(tmp_path / "DSC01238.JPG", shot_at, size=(6000, 4000), seed=4, gps=True)
    destination = tmp_path / "out" / "preview.jpg"
    with open_oriented(source) as image:
        size = make_preview(
            image,
            destination,
            config.preview_max_edge,
            config.preview_quality,
            config.watermark,
        )
    assert size == (2048, 1365)
    with Image.open(destination) as preview:
        assert preview.size == (2048, 1365)
        exif = preview.getexif()
        assert dict(exif) == {}
        assert dict(exif.get_ifd(ExifTags.IFD.GPSInfo)) == {}


def test_vignette_bord_long(tmp_path, config):
    source = make_photo(tmp_path / "DSC01239.JPG", size=(6000, 4000), seed=5)
    destination = tmp_path / "out" / "thumb.jpg"
    with open_oriented(source) as image:
        assert make_thumbnail(
            image,
            destination,
            config.thumb_max_edge,
            config.thumb_quality,
            config.watermark,
        ) == (512, 341)


def test_pas_d_agrandissement(tmp_path, config):
    source = make_photo(tmp_path / "DSC01240.JPG", size=(1200, 800), seed=6)
    with open_oriented(source) as image:
        size = make_preview(
            image, tmp_path / "out" / "p.jpg", 2048, 82, config.watermark
        )
    assert size == (1200, 800)


def test_filigrane_modifie_l_image(tmp_path):
    source = make_photo(tmp_path / "DSC01241.JPG", size=(1200, 800), seed=7)
    with open_oriented(source) as image:
        plain = image.convert("RGB")
        stamped = apply_watermark(plain, Watermark("CROC PARC", 0.65))
    assert stamped.size == plain.size
    left, right = plain.tobytes(), stamped.tobytes()
    changed = sum(1 for a, b in zip(left, right) if a != b)
    # Un filigrane diagonal repete touche une part significative de l'image.
    assert changed > len(left) * 0.02


def test_filigrane_vide_ne_fait_rien(tmp_path):
    source = make_photo(tmp_path / "DSC01242.JPG", size=(400, 300), seed=8)
    with open_oriented(source) as image:
        plain = image.convert("RGB")
        assert apply_watermark(plain, Watermark("", 0.65)) is plain


def test_copie_verifiee_identique(tmp_path):
    source = make_photo(tmp_path / "DSC01243.JPG", size=(2400, 1600), seed=9)
    destination = tmp_path / "archive" / "2026-10-15" / "K7M2QP" / "DSC01243.JPG"
    copy_verified(source, destination)
    assert md5(source) == md5(destination)
    assert destination.stat().st_size == source.stat().st_size
    assert not destination.with_name(destination.name + ".part").exists()


def test_copie_ne_laisse_pas_de_fichier_partiel(tmp_path, monkeypatch):
    source = make_photo(tmp_path / "DSC01244.JPG", size=(400, 300), seed=10)
    destination = tmp_path / "archive" / "DSC01244.JPG"

    empreintes = iter(["aaa", "bbb"])
    monkeypatch.setattr("bridge.imaging.sha1_of", lambda *_: next(empreintes))
    with pytest.raises(ImageError, match="copie corrompue"):
        copy_verified(source, destination)
    assert not destination.exists()
    assert not destination.with_name(destination.name + ".part").exists()
