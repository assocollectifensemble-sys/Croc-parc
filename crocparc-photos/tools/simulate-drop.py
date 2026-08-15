#!/usr/bin/env python3
"""Simule une matinee de prise de vue dans le dossier FTP.

Fabrique des JPEG synthetiques (cartes QR comprises) et les depose dans l'inbox
du pont, au rythme reel du transfert si on le demande. Sert a rejouer le critere
d'acceptation de la phase A a la main :

    python3 tools/simulate-drop.py --inbox bridge/data/inbox --groupes 3 --photos 9
    cd bridge && python3 -m bridge once
"""

from __future__ import annotations

import argparse
import random
import time
from datetime import datetime, timedelta
from pathlib import Path

import qrcode
from PIL import ExifTags, Image, ImageDraw

ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"


def exif_bytes(shot_at: datetime) -> bytes:
    exif = Image.Exif()
    exif.get_ifd(ExifTags.IFD.Exif)[ExifTags.Base.DateTimeOriginal] = shot_at.strftime(
        "%Y:%m:%d %H:%M:%S"
    )
    return exif.tobytes()


def photo(path: Path, shot_at: datetime, size: tuple[int, int], rng: random.Random) -> None:
    image = Image.new("RGB", size, (rng.randint(60, 200), rng.randint(60, 200), 90))
    draw = ImageDraw.Draw(image)
    for _ in range(60):
        x, y = rng.randint(0, size[0]), rng.randint(0, size[1])
        draw.ellipse(
            [x, y, x + rng.randint(40, 500), y + rng.randint(40, 500)],
            fill=(rng.randint(0, 255), rng.randint(0, 255), rng.randint(0, 255)),
        )
    image.save(path, "JPEG", quality=90, exif=exif_bytes(shot_at))


def carte(path: Path, code: str, shot_at: datetime, size: tuple[int, int], base_url: str) -> None:
    qr = qrcode.QRCode(box_size=10, border=4)
    qr.add_data(f"{base_url}{code}")
    qr.make(fit=True)
    image = qr.make_image(fill_color="black", back_color="white").convert("RGB")
    canvas = Image.new("RGB", size, (232, 230, 224))
    side = int(min(size) * 0.6)
    canvas.paste(image.resize((side, side)), ((size[0] - side) // 2, (size[1] - side) // 2))
    canvas.save(path, "JPEG", quality=92, exif=exif_bytes(shot_at))


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--inbox", type=Path, required=True)
    parser.add_argument("--groupes", type=int, default=3, help="nombre de cartes")
    parser.add_argument("--photos", type=int, default=9, help="photos par groupe")
    parser.add_argument("--taille", default="2400x1600")
    parser.add_argument("--base-url", default="https://photos.crocparc.re/g/")
    parser.add_argument("--graine", type=int, default=974)
    parser.add_argument(
        "--delai", type=float, default=0.0, help="secondes entre deux fichiers"
    )
    args = parser.parse_args()

    width, height = (int(part) for part in args.taille.lower().split("x"))
    size = (width, height)
    rng = random.Random(args.graine)
    args.inbox.mkdir(parents=True, exist_ok=True)

    debut = datetime.now().replace(hour=9, minute=0, second=0, microsecond=0)
    numero = 1
    codes = []
    for groupe in range(args.groupes):
        code = "".join(rng.choice(ALPHABET) for _ in range(6))
        codes.append(code)
        instant = debut + timedelta(minutes=groupe * 30)
        carte(args.inbox / f"DSC{numero:05d}.JPG", code, instant, size, args.base_url)
        print(f"carte   {code}  DSC{numero:05d}.JPG")
        numero += 1
        if args.delai:
            time.sleep(args.delai)
        for index in range(args.photos):
            photo(
                args.inbox / f"DSC{numero:05d}.JPG",
                instant + timedelta(minutes=index + 1),
                size,
                rng,
            )
            numero += 1
            if args.delai:
                time.sleep(args.delai)

    print(f"\n{numero - 1} fichiers deposes dans {args.inbox}")
    print(f"codes attendus : {', '.join(codes)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
