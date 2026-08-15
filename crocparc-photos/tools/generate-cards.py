#!/usr/bin/env python3
"""Planches de cartes QR imprimables, en PDF.

Chaque carte porte :
- un QR encodant l'URL complete de la galerie (c'est lui que la photographe
  photographie pour ouvrir une session) ;
- le code a six caracteres, en gros, lisible a la main ;
- un numero d'inventaire a quatre chiffres, discret, pour le stock physique.

Deux fichiers sortent : le PDF a imprimer et un CSV `code,card_number` que le
pont peut lire (CARDS_INVENTORY_CSV) pour associer un code a une carte.

    python3 tools/generate-cards.py --nombre 300 --sortie cartes/

Attention au reemploi : une carte ne doit pas repartir en circulation avant
l'expiration de sa galerie (30 jours), sinon deux familles partagent le meme
code et le site doit leur demander leur date de visite pour les demeler.
Imprimez donc de quoi tenir plus d'un mois de rotation.
"""

from __future__ import annotations

import argparse
import csv
import secrets
from pathlib import Path

import qrcode
from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas

# Meme alphabet que le pont : ni I, ni O, ni 0, ni 1.
ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
CODE_LENGTH = 6

VERT = HexColor("#2f6b4f")
ENCRE = HexColor("#16211c")
GRIS = HexColor("#8a958f")

# Grille de decoupe : 2 colonnes x 4 lignes sur A4, soit 8 cartes de 85 x 65 mm.
COLONNES, LIGNES = 2, 4
CARTE_L, CARTE_H = 90 * mm, 65 * mm
MARGE_X = (A4[0] - COLONNES * CARTE_L) / 2
MARGE_Y = (A4[1] - LIGNES * CARTE_H) / 2


def tirer_codes(nombre: int, deja_pris: set[str]) -> list[str]:
    """Tire des codes uniques, sans dependre du hasard du systeme d'exploitation.

    `secrets` plutot que `random` : ces codes sont la seule chose qui protege
    une galerie, ils ne doivent pas etre previsibles.
    """
    codes: set[str] = set()
    while len(codes) < nombre:
        code = "".join(secrets.choice(ALPHABET) for _ in range(CODE_LENGTH))
        if code not in deja_pris:
            codes.add(code)
    return sorted(codes)


def charger_existants(chemin: Path) -> tuple[set[str], int]:
    """Relit un inventaire existant pour ne jamais reutiliser un code."""
    if not chemin.is_file():
        return set(), 0
    codes: set[str] = set()
    dernier = 0
    with chemin.open(newline="", encoding="utf-8") as fichier:
        for ligne in csv.DictReader(fichier):
            code = (ligne.get("code") or "").strip().upper()
            if code:
                codes.add(code)
            numero = (ligne.get("card_number") or "").strip()
            if numero.isdigit():
                dernier = max(dernier, int(numero))
    return codes, dernier


def image_qr(url: str):
    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_Q,  # tolere une carte salie
        box_size=10,
        border=2,
    )
    qr.add_data(url)
    qr.make(fit=True)
    return qr.make_image(fill_color="black", back_color="white").convert("RGB")


def dessiner_carte(pdf: canvas.Canvas, x: float, y: float, code: str, numero: int,
                   base_url: str, dossier_temp: Path) -> None:
    pdf.setStrokeColor(HexColor("#d8d2c4"))
    pdf.setLineWidth(0.3)
    pdf.rect(x, y, CARTE_L, CARTE_H)

    # Bandeau du parc
    pdf.setFillColor(VERT)
    pdf.rect(x, y + CARTE_H - 12 * mm, CARTE_L, 12 * mm, stroke=0, fill=1)
    pdf.setFillColor(HexColor("#ffffff"))
    pdf.setFont("Helvetica-Bold", 12)
    pdf.drawString(x + 6 * mm, y + CARTE_H - 8 * mm, "CROC PARC")
    pdf.setFont("Helvetica", 8)
    pdf.drawRightString(x + CARTE_L - 6 * mm, y + CARTE_H - 8 * mm, "vos photos de visite")

    # QR : la photographe le photographie, le visiteur le scanne.
    taille_qr = 34 * mm
    chemin_qr = dossier_temp / f"{code}.png"
    image_qr(f"{base_url}{code}").save(chemin_qr)
    pdf.drawImage(
        str(chemin_qr),
        x + 6 * mm,
        y + 10 * mm,
        taille_qr,
        taille_qr,
        preserveAspectRatio=True,
    )

    # Code lisible, la seule chose que le visiteur aura a taper.
    gauche = x + 46 * mm
    pdf.setFillColor(GRIS)
    pdf.setFont("Helvetica", 7.5)
    pdf.drawString(gauche, y + 38 * mm, "VOTRE CODE")
    pdf.setFillColor(ENCRE)
    pdf.setFont("Courier-Bold", 21)
    pdf.drawString(gauche, y + 29 * mm, code)

    pdf.setFillColor(GRIS)
    pdf.setFont("Helvetica", 7)
    pdf.drawString(gauche, y + 22 * mm, "Scannez le QR ou tapez le code sur")
    pdf.setFont("Helvetica-Bold", 7.5)
    pdf.setFillColor(VERT)
    # rstrip("/g/") retirerait aussi un "g" final legitime dans un domaine :
    # on enleve le suffixe, pas un jeu de caracteres.
    domaine = base_url.removeprefix("https://").removeprefix("http://").removesuffix("/g/")
    pdf.drawString(gauche, y + 18 * mm, domaine)
    pdf.setFillColor(GRIS)
    pdf.setFont("Helvetica", 6.5)
    pdf.drawString(gauche, y + 13 * mm, "Photos disponibles 30 jours.")

    # Numero d'inventaire, pour la photographe uniquement.
    pdf.setFont("Helvetica", 6)
    pdf.setFillColor(GRIS)
    pdf.drawRightString(x + CARTE_L - 4 * mm, y + 4 * mm, f"n° {numero:04d}")

    chemin_qr.unlink(missing_ok=True)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--nombre", type=int, default=40, help="nombre de cartes a produire")
    parser.add_argument("--sortie", type=Path, default=Path("cartes"))
    parser.add_argument("--base-url", default="https://photos.crocparc.re/g/")
    parser.add_argument(
        "--inventaire",
        type=Path,
        help="CSV existant a completer ; les codes deja pris ne sont jamais retires",
    )
    args = parser.parse_args()

    base_url = args.base_url if args.base_url.endswith("/") else args.base_url + "/"
    args.sortie.mkdir(parents=True, exist_ok=True)
    inventaire = args.inventaire or (args.sortie / "inventaire.csv")

    deja_pris, dernier_numero = charger_existants(inventaire)
    codes = tirer_codes(args.nombre, deja_pris)

    temp = args.sortie / ".qr-temp"
    temp.mkdir(exist_ok=True)

    pdf_chemin = args.sortie / f"cartes-{dernier_numero + 1:04d}-{dernier_numero + args.nombre:04d}.pdf"
    pdf = canvas.Canvas(str(pdf_chemin), pagesize=A4)
    pdf.setTitle("Cartes Croc Parc Photos")

    nouvelles: list[tuple[str, int]] = []
    for index, code in enumerate(codes):
        numero = dernier_numero + index + 1
        position = index % (COLONNES * LIGNES)
        if position == 0 and index > 0:
            pdf.showPage()
        colonne = position % COLONNES
        ligne = position // COLONNES
        x = MARGE_X + colonne * CARTE_L
        y = A4[1] - MARGE_Y - (ligne + 1) * CARTE_H
        dessiner_carte(pdf, x, y, code, numero, base_url, temp)
        nouvelles.append((code, numero))

    pdf.save()
    temp.rmdir()

    nouveau = not inventaire.is_file()
    with inventaire.open("a", newline="", encoding="utf-8") as fichier:
        ecrivain = csv.writer(fichier)
        if nouveau:
            ecrivain.writerow(["code", "card_number"])
        ecrivain.writerows(nouvelles)

    print(f"{len(nouvelles)} cartes : {pdf_chemin}")
    print(f"inventaire : {inventaire}")
    print(
        "\nRappel : ne remettez pas une carte en circulation avant 30 jours, "
        "sinon deux familles partagent le meme code."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
