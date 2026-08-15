"""Bout en bout, sans cloud : du depot FTP aux previews filigranees.

Critere d'acceptation de la phase A : on depose 30 JPEG dont 3 cartes dans le
dossier surveille, on obtient 3 sessions correctes avec previews filigranees et
sans les photos de cartes.
"""

from __future__ import annotations

import dataclasses
import hashlib
import time
from datetime import datetime
from pathlib import Path

import pytest
from PIL import Image

from bridge.config import Config
from bridge.imaging import make_preview, open_oriented, read_metadata, sha1_of
from bridge.models import FileState, SessionStatus
from bridge.processor import Processor
from bridge.queue import Queue
from bridge.uploader import LocalStorage, NullRegistrar
from bridge.watcher import scan_inbox
from conftest import make_card, make_photo

T0 = 1_000_000.0
JOUR = "2026-10-15"
CODES = ("K7M2QP", "Q4RT5Y", "W8XZ3N")


def md5(path: Path) -> str:
    return hashlib.md5(path.read_bytes()).hexdigest()


def run(processor: Processor, config: Config, queue: Queue, now: float = T0) -> int:
    """Un cycle complet : balayage, mesure de stabilite, puis traitement."""
    scan_inbox(config, queue)
    processor.tick(now=now)  # premiere mesure de taille
    return processor.drain(now=now + config.stable_seconds + 1)


def deposer_journee(inbox: Path) -> dict[str, list[Path]]:
    """3 cartes, 9 photos chacune : 30 fichiers, comme une vraie matinee."""
    inbox.mkdir(parents=True, exist_ok=True)
    depose: dict[str, list[Path]] = {}
    numero = 1
    for index, code in enumerate(CODES):
        heure = 10 + index
        carte = make_card(
            inbox / f"DSC{numero:05d}.JPG", code, datetime(2026, 10, 15, heure, 0, 0)
        )
        depose[code] = []
        depose.setdefault("cartes", []).append(carte)
        numero += 1
        for minute in range(1, 10):
            photo = make_photo(
                inbox / f"DSC{numero:05d}.JPG",
                datetime(2026, 10, 15, heure, minute * 5),
                seed=numero,
            )
            depose[code].append(photo)
            numero += 1
    return depose


def archives(config: Config) -> set[str]:
    """Originaux archives localement, en chemins relatifs a ORIGINALS_DIR."""
    racine = config.originals_dir
    return {
        str(path.relative_to(racine)).replace("\\", "/")
        for path in racine.rglob("*.JPG")
        if path.is_file() and path.parts[len(racine.parts)] != "cards"
    }


def cles(config: Config, bucket: str) -> set[str]:
    racine = config.output_dir / bucket
    if not racine.is_dir():
        return set()
    return {
        str(path.relative_to(racine)) for path in racine.rglob("*") if path.is_file()
    }


# -- critere d'acceptation ---------------------------------------------------
def test_trente_jpeg_trois_cartes_trois_sessions(config, queue, processor):
    depose = deposer_journee(config.watch_dir)
    assert len(list(config.watch_dir.glob("*.JPG"))) == 30

    run(processor, config, queue)

    sessions = queue.sessions_for_day(JOUR)
    assert [session.code for session in sessions] == list(CODES)
    assert all(session.status is SessionStatus.ACTIVE for session in sessions)
    assert [session.photo_count for session in sessions] == [9, 9, 9]

    previews = cles(config, config.previews_bucket)
    assert len(previews) == 54  # 27 previews + 27 vignettes
    # Les originaux ne montent pas sur le stockage objet : ils restent au parc
    # et n'en partiront que vendus, sur appel de /fetch-original.
    assert cles(config, config.originals_bucket) == set()
    stockes = archives(config)
    assert len(stockes) == 27

    for code in CODES:
        for photo in depose[code]:
            ligne = queue.get(photo)
            assert ligne.preview_key in previews
            assert ligne.thumb_key in previews
            # L'archive locale reste lisible par un humain, la cle publique non.
            assert f"{JOUR}/{code}/{photo.name}" in stockes
            assert ligne.original_path == f"{JOUR}/{code}/{photo.name}"


def test_les_photos_de_cartes_ne_sont_jamais_publiees(config, queue, processor):
    depose = deposer_journee(config.watch_dir)
    run(processor, config, queue)

    publie = cles(config, config.previews_bucket) | cles(config, config.originals_bucket)
    for carte in depose["cartes"]:
        assert not any(carte.stem in cle for cle in publie)
        ligne = queue.get(carte)
        assert ligne.state is FileState.DONE
        assert ligne.is_card is True
        assert ligne.preview_key is None and ligne.original_path is None
        assert ligne.session_id is not None
        # La carte est tout de meme archivee localement, pour pouvoir enqueter
        # sur une lecture douteuse.
        archive = config.originals_dir / "cards" / JOUR / f"{ligne.code}-{carte.name}"
        assert archive.is_file()


def test_previews_filigranees_et_dimensionnees(config, queue, processor):
    depose = deposer_journee(config.watch_dir)
    run(processor, config, queue)

    source = depose[CODES[0]][0]
    ligne = queue.get(source)
    preview = config.output_dir / config.previews_bucket / ligne.preview_key
    thumb = config.output_dir / config.previews_bucket / ligne.thumb_key

    with Image.open(preview) as image:
        assert max(image.size) == 2048
        filigranee = image.convert("RGB").tobytes()
    with Image.open(thumb) as image:
        assert max(image.size) == 512

    # Reference : la meme preview fabriquee par le meme code, filigrane coupe.
    reference = config.work_dir / "reference.jpg"
    with open_oriented(source) as image:
        make_preview(
            image,
            reference,
            config.preview_max_edge,
            config.preview_quality,
            dataclasses.replace(config.watermark, text=""),
        )
    with Image.open(reference) as image:
        nue = image.convert("RGB").tobytes()

    differences = sum(1 for a, b in zip(nue, filigranee) if a != b)
    assert differences > len(nue) * 0.05  # le filigrane se voit


def test_originaux_copies_a_l_identique(config, queue, processor):
    depose = deposer_journee(config.watch_dir)
    run(processor, config, queue)

    for code in CODES:
        for source in depose[code]:
            archive = config.originals_dir / JOUR / code / source.name
            assert md5(archive) == md5(source)


# -- robustesse ---------------------------------------------------------------
def test_rejouer_ne_duplique_rien(config, queue, processor):
    deposer_journee(config.watch_dir)
    run(processor, config, queue)
    empreintes = {cle: md5(config.output_dir / config.previews_bucket / cle)
                  for cle in cles(config, config.previews_bucket)}
    sessions = {session.id for session in queue.sessions_for_day(JOUR)}

    run(processor, config, queue, now=T0 + 60)
    run(processor, config, queue, now=T0 + 120)

    assert {session.id for session in queue.sessions_for_day(JOUR)} == sessions
    assert cles(config, config.previews_bucket) == set(empreintes)
    assert [s.photo_count for s in queue.sessions_for_day(JOUR)] == [9, 9, 9]


def test_redemarrage_du_service_reprend_sans_perte_ni_doublon(config, tmp_path):
    """Coupure au milieu du lot : le service redemarre et finit le travail."""
    deposer_journee(config.watch_dir)

    premiere = Queue(config.db_path)
    premiere.migrate()
    processeur = Processor(config, premiere, LocalStorage(config.output_dir), NullRegistrar())
    scan_inbox(config, premiere)
    processeur.tick(now=T0)
    processeur.tick(now=T0 + 3)  # quelques etapes seulement, puis on coupe
    premiere.close()

    seconde = Queue(config.db_path)
    seconde.migrate()
    reprise = Processor(config, seconde, LocalStorage(config.output_dir), NullRegistrar())
    run(reprise, config, seconde, now=T0 + 10)

    assert [s.photo_count for s in seconde.sessions_for_day(JOUR)] == [9, 9, 9]
    assert len(archives(config)) == 27
    restants = seconde.ready(
        (FileState.DISCOVERED, FileState.STABLE, FileState.ANALYZED,
         FileState.PROCESSED, FileState.UPLOADED), now=T0 + 1000
    )
    assert restants == []
    seconde.close()


def test_fichier_en_cours_d_ecriture_n_est_pas_traite(config, queue, processor):
    """Le FTP ecrit progressivement : tant que la taille bouge, on ne touche a rien."""
    chemin = config.watch_dir / "DSC09999.JPG"
    make_photo(chemin, datetime(2026, 10, 15, 10, 0, 0), size=(2400, 1600), seed=99)
    complet = chemin.read_bytes()
    chemin.write_bytes(complet[: len(complet) // 3])

    scan_inbox(config, queue)
    processor.tick(now=T0)
    assert queue.get(chemin).state is FileState.DISCOVERED

    chemin.write_bytes(complet[: len(complet) // 2])  # le transfert continue
    processor.tick(now=T0 + 5)
    assert queue.get(chemin).state is FileState.DISCOVERED

    chemin.write_bytes(complet)
    processor.tick(now=T0 + 10)
    assert queue.get(chemin).state is FileState.DISCOVERED  # premiere mesure de la taille finale

    processor.drain(now=T0 + 13)
    ligne = queue.get(chemin)
    assert ligne.state is FileState.DONE
    # L'original archive est le fichier complet : aucun JPEG tronque n'est passe.
    session = queue.session(ligne.session_id)
    archive = config.originals_dir / JOUR / session.code / chemin.name
    assert md5(archive) == hashlib.md5(complet).hexdigest()


def test_reseau_coupe_puis_retabli(config, queue):
    """Make ou l'API tombent : rien n'est perdu, tout se rattrape."""

    class RegistrarCapricieux:
        def __init__(self) -> None:
            self.echecs = 0
            self.en_panne = True

        def register(self, session, photos):
            if self.en_panne:
                self.echecs += 1
                raise ConnectionError("reseau indisponible")

    registrar = RegistrarCapricieux()
    processeur = Processor(config, queue, LocalStorage(config.output_dir), registrar)
    deposer_journee(config.watch_dir)

    run(processeur, config, queue)
    assert registrar.echecs > 0
    assert len(cles(config, config.previews_bucket)) == 54  # deja depose sur le stockage
    assert len(archives(config)) == 27  # et archive au parc
    en_attente = queue.ready((FileState.UPLOADED,), now=T0 + 10_000)
    assert len(en_attente) == 27  # rien n'est perdu, tout attend son tour

    registrar.en_panne = False
    processeur.drain(now=T0 + 14_400)  # quatre heures plus tard
    assert queue.ready((FileState.UPLOADED,), now=T0 + 20_000) == []
    assert [s.photo_count for s in queue.sessions_for_day(JOUR)] == [9, 9, 9]


def test_photos_avant_toute_carte_en_session_orpheline(config, queue, processor):
    for index in range(3):
        make_photo(
            config.watch_dir / f"DSC0000{index}.JPG",
            datetime(2026, 10, 15, 8, 30 + index),
            seed=index,
        )
    make_card(config.watch_dir / "DSC00010.JPG", "K7M2QP", datetime(2026, 10, 15, 9, 0))
    make_photo(config.watch_dir / "DSC00011.JPG", datetime(2026, 10, 15, 9, 5), seed=11)

    run(processor, config, queue)

    sessions = {session.code: session for session in queue.sessions_for_day(JOUR)}
    assert set(sessions) == {"ORPHAN", "K7M2QP"}
    assert sessions["ORPHAN"].status is SessionStatus.ORPHAN
    assert sessions["ORPHAN"].photo_count == 3
    assert sessions["K7M2QP"].photo_count == 1
    assert any(evenement["kind"] == "orphan" for evenement in queue.events())


def test_deux_cartes_consecutives_donnent_une_session_vide(config, queue, processor):
    make_card(config.watch_dir / "DSC00001.JPG", "K7M2QP", datetime(2026, 10, 15, 10, 0))
    make_card(config.watch_dir / "DSC00002.JPG", "Q4RT5Y", datetime(2026, 10, 15, 10, 1))
    make_photo(config.watch_dir / "DSC00003.JPG", datetime(2026, 10, 15, 10, 2), seed=3)

    run(processor, config, queue)

    sessions = {session.code: session for session in queue.sessions_for_day(JOUR)}
    assert sessions["K7M2QP"].photo_count == 0  # session vide, aucune erreur
    assert sessions["Q4RT5Y"].photo_count == 1
    assert queue.ready((FileState.FAILED,), now=T0 + 10_000) == []


def test_carte_arrivee_apres_ses_photos(config, queue, processor):
    """Le FTP a inverse deux fichiers : la photo est rerangee quand la carte arrive."""
    make_card(config.watch_dir / "DSC00001.JPG", "K7M2QP", datetime(2026, 10, 15, 10, 0))
    photo = make_photo(config.watch_dir / "DSC00003.JPG", datetime(2026, 10, 15, 11, 5), seed=3)
    run(processor, config, queue)
    assert queue.get(photo).session_id == queue.sessions_for_day(JOUR)[0].id

    make_card(config.watch_dir / "DSC00002.JPG", "Q4RT5Y", datetime(2026, 10, 15, 11, 0))
    run(processor, config, queue, now=T0 + 100)

    sessions = {session.code: session for session in queue.sessions_for_day(JOUR)}
    assert any(
        evenement["kind"] in ("reassigned", "reassign_conflict")
        for evenement in queue.events()
    )
    assert sessions["Q4RT5Y"].photo_count + sessions["K7M2QP"].photo_count == 1


def test_photo_sans_date_exif_utilise_la_date_du_fichier(config, queue, processor):
    make_card(config.watch_dir / "DSC00001.JPG", "K7M2QP", datetime(2026, 10, 15, 10, 0))
    sans_exif = make_photo(config.watch_dir / "DSC00002.JPG", shot_at=None, seed=2)
    run(processor, config, queue)
    ligne = queue.get(sans_exif)
    assert ligne.state is FileState.DONE
    assert ligne.shot_at is not None


def test_fichier_non_jpeg_ignore(config, queue, processor):
    (config.watch_dir / "notes.txt").write_text("bonjour", encoding="utf-8")
    (config.watch_dir / "DSC00001.ARW").write_bytes(b"raw")
    scan_inbox(config, queue)
    assert queue.ready(tuple(FileState), now=T0) == []


def test_jpeg_illisible_mis_en_quarantaine(config, queue, processor):
    corrompu = config.watch_dir / "DSC00001.JPG"
    corrompu.write_bytes(b"\xff\xd8\xff\xe0 pas vraiment un JPEG")
    run(processor, config, queue)
    for tentative in range(1, 12):
        processor.tick(now=T0 + 3 + tentative * 400)
    ligne = queue.get(corrompu)
    assert ligne.state is FileState.FAILED
    assert "ImageError" in ligne.last_error
    assert any(evenement["kind"] == "quarantine" for evenement in queue.events())


# -- retention et reutilisation des cartes ------------------------------------
def test_purge_de_l_inbox_apres_retention(config, queue, processor):
    """Les originaux de l'inbox s'effacent une fois archives depuis 15 jours."""
    deposer_journee(config.watch_dir)
    run(processor, config, queue)
    assert len(list(config.watch_dir.glob("*.JPG"))) == 30

    # La retention se compte sur l'horloge murale, pas sur la base de temps du
    # backoff : rien ne part avant l'echeance.
    assert processor.purge_inbox(now=time.time()) == 0
    assert len(list(config.watch_dir.glob("*.JPG"))) == 30

    assert processor.purge_inbox(now=time.time() + 16 * 24 * 3600) == 30
    assert list(config.watch_dir.glob("*.JPG")) == []

    # Les archives et la sortie publiable, elles, ne bougent pas.
    assert len(cles(config, config.previews_bucket)) == 54
    assert len(list((config.originals_dir / JOUR).rglob("*.JPG"))) == 27
    assert len(list((config.originals_dir / "cards").rglob("*.JPG"))) == 3
    # Et un balayage apres purge ne ressuscite rien.
    scan_inbox(config, queue)
    assert [s.photo_count for s in queue.sessions_for_day(JOUR)] == [9, 9, 9]


def test_purge_refuse_si_l_archive_manque(config, queue, processor):
    make_card(config.watch_dir / "DSC00001.JPG", "K7M2QP", datetime(2026, 10, 15, 10, 0))
    photo = make_photo(config.watch_dir / "DSC00002.JPG", datetime(2026, 10, 15, 10, 5), seed=2)
    run(processor, config, queue)

    (config.originals_dir / JOUR / "K7M2QP" / "DSC00002.JPG").unlink()
    assert processor.purge_inbox(now=time.time() + 16 * 24 * 3600) == 1  # seule la carte part
    assert photo.exists()


def test_purge_refuse_si_l_archive_differe(config, queue, processor):
    make_card(config.watch_dir / "DSC00001.JPG", "K7M2QP", datetime(2026, 10, 15, 10, 0))
    photo = make_photo(config.watch_dir / "DSC00002.JPG", datetime(2026, 10, 15, 10, 5), seed=2)
    run(processor, config, queue)

    archive = config.originals_dir / JOUR / "K7M2QP" / "DSC00002.JPG"
    archive.write_bytes(archive.read_bytes() + b"corruption")
    processor.purge_inbox(now=time.time() + 16 * 24 * 3600)
    assert photo.exists()
    assert any(evenement["kind"] == "purge_conflict" for evenement in queue.events())


def test_purge_desactivable(config, queue, tmp_path):
    configuration = dataclasses.replace(config, watch_retention_days=0)
    processeur = Processor(
        configuration, queue, LocalStorage(configuration.output_dir), NullRegistrar()
    )
    make_card(config.watch_dir / "DSC00001.JPG", "K7M2QP", datetime(2026, 10, 15, 10, 0))
    run(processeur, configuration, queue)
    assert processeur.purge_inbox(now=time.time() + 365 * 24 * 3600) == 0
    assert (config.watch_dir / "DSC00001.JPG").exists()


def test_le_sas_de_travail_ne_grossit_pas(config, queue, processor):
    """Les derives sont effaces du dossier de travail une fois deposes."""
    deposer_journee(config.watch_dir)
    run(processor, config, queue)
    assert list(config.work_dir.rglob("*.jpg")) == []
    assert len(cles(config, config.previews_bucket)) == 54


def test_carte_rephotographiee_le_meme_jour_est_signalee(config, queue, processor):
    """Deux groupes, une seule carte, le meme jour : galerie partagee, alerte levee."""
    make_card(config.watch_dir / "DSC00001.JPG", "K7M2QP", datetime(2026, 10, 15, 10, 0))
    make_photo(config.watch_dir / "DSC00002.JPG", datetime(2026, 10, 15, 10, 5), seed=2)
    make_card(config.watch_dir / "DSC00003.JPG", "K7M2QP", datetime(2026, 10, 15, 14, 0))
    make_photo(config.watch_dir / "DSC00004.JPG", datetime(2026, 10, 15, 14, 5), seed=4)

    run(processor, config, queue)

    sessions = queue.sessions_for_day(JOUR)
    assert len(sessions) == 1  # une session par (code, date)
    assert sessions[0].photo_count == 2
    alertes = [e for e in queue.events() if e["kind"] == "card_reused"]
    assert len(alertes) == 1
    assert "K7M2QP" in alertes[0]["message"]


def test_carte_reutilisee_un_autre_jour_ouvre_une_session_neuve(config, queue, processor):
    make_card(config.watch_dir / "DSC00001.JPG", "K7M2QP", datetime(2026, 10, 15, 10, 0))
    make_photo(config.watch_dir / "DSC00002.JPG", datetime(2026, 10, 15, 10, 5), seed=2)
    make_card(config.watch_dir / "DSC00003.JPG", "K7M2QP", datetime(2026, 10, 16, 10, 0))
    make_photo(config.watch_dir / "DSC00004.JPG", datetime(2026, 10, 16, 10, 5), seed=4)

    run(processor, config, queue)

    assert len(queue.sessions_for_day("2026-10-15")) == 1
    assert len(queue.sessions_for_day("2026-10-16")) == 1
    assert queue.sessions_for_day("2026-10-15")[0].id != queue.sessions_for_day("2026-10-16")[0].id
    assert not [e for e in queue.events() if e["kind"] == "card_reused"]


def test_original_archive_nettoye_de_ses_coordonnees_gps(config, queue, processor):
    """Une photo geolocalisee est vendue sans ses coordonnees, sans perte de qualite."""
    make_card(config.watch_dir / "DSC00001.JPG", "K7M2QP", datetime(2026, 10, 15, 10, 0))
    source = make_photo(
        config.watch_dir / "DSC00002.JPG",
        datetime(2026, 10, 15, 10, 5),
        seed=42,
        gps=True,
    )
    with Image.open(source) as image:
        pixels_source = hashlib.md5(image.tobytes()).hexdigest()

    run(processor, config, queue)

    archive = config.originals_dir / JOUR / "K7M2QP" / "DSC00002.JPG"
    assert read_metadata(archive).has_gps is False
    assert read_metadata(source).has_gps is True  # le fichier de l'inbox n'est pas touche
    with Image.open(archive) as image:
        assert hashlib.md5(image.tobytes()).hexdigest() == pixels_source
    assert any(evenement["kind"] == "gps_removed" for evenement in queue.events())

    # L'empreinte enregistree suit l'archive nettoyee, sinon la purge refuserait
    # d'effacer ce fichier en croyant l'archive corrompue.
    assert queue.get(source).sha1 == sha1_of(archive)
    assert processor.purge_inbox(now=time.time() + 16 * 24 * 3600) == 2
    assert not source.exists()


def test_cles_publiques_indevinables_et_stables(config, queue, processor):
    """Le bucket des previews est public : ses cles ne doivent rien reveler.

    Une cle du type `2026-10-15/K7M2QP/DSC01234_p.jpg` se devine des qu'on
    connait la date et le code. Pour la session ORPHAN, dont le code est
    documente, elle s'enumere meme sans carte -- et hors de portee de toute
    limitation de debit, puisque le bucket repond directement.
    """
    depose = deposer_journee(config.watch_dir)
    run(processor, config, queue)

    for code in CODES:
        for photo in depose[code]:
            ligne = queue.get(photo)
            for cle in (ligne.preview_key, ligne.thumb_key):
                assert cle.startswith(f"{JOUR}/")  # la date reste utile a la purge
                assert code not in cle
                assert photo.stem not in cle
                assert len(cle.split("/")[-1].split("_")[0]) == 32

    # Deterministe : rejouer ne cree pas une deuxieme copie sous une autre cle.
    avant = {p: queue.get(p).preview_key for p in depose[CODES[0]]}
    run(processor, config, queue, now=T0 + 120)
    assert {p: queue.get(p).preview_key for p in depose[CODES[0]]} == avant
    assert len(cles(config, config.previews_bucket)) == 54


def test_photo_declaree_n_est_plus_rerangee(config, queue, processor):
    """Une reponse perdue ne doit pas faire exister la photo dans deux sessions.

    Si /api/ingest a bien ecrit mais que la reponse s'est perdue, la ligne reste
    en `uploaded`. Sans le drapeau `declared`, une carte arrivee en retard la
    rerangerait ailleurs : la photo existerait deux fois en base, dont une dans
    la session orpheline, preview publique comprise.
    """
    photo = make_photo(config.watch_dir / "DSC00003.JPG", datetime(2026, 10, 15, 11, 5), seed=3)
    run(processor, config, queue)  # aucune carte : session orpheline
    orpheline = queue.get(photo).session_id
    assert queue.get(photo).declared is True

    make_card(config.watch_dir / "DSC00002.JPG", "K7M2QP", datetime(2026, 10, 15, 11, 0))
    run(processor, config, queue, now=T0 + 100)

    assert queue.get(photo).session_id == orpheline  # rien n'a bouge
    assert any(e["kind"] == "reassign_conflict" for e in queue.events())


def test_carte_remise_en_circulation_trop_tot_est_mise_en_quarantaine(config, queue, processor):
    """Le seul chemin par lequel une famille pourrait voir les photos d'une autre.

    Le visiteur ne possede que son code : deux galeries actives sous le meme
    code seraient indemelables. Le pont refuse donc d'en ouvrir une seconde, et
    range les photos en orphelines plutot que de risquer la confusion.
    """
    # Premiere visite, le 15 octobre.
    make_card(config.watch_dir / "DSC00001.JPG", "K7M2QP", datetime(2026, 10, 15, 10, 0))
    premiere = make_photo(config.watch_dir / "DSC00002.JPG", datetime(2026, 10, 15, 10, 5), seed=2)
    run(processor, config, queue)
    assert queue.sessions_for_day(JOUR)[0].photo_count == 1

    # La meme carte ressort le 20, avant expiration de la galerie du 15.
    make_card(config.watch_dir / "DSC00003.JPG", "K7M2QP", datetime(2026, 10, 20, 9, 0))
    seconde = make_photo(config.watch_dir / "DSC00004.JPG", datetime(2026, 10, 20, 9, 5), seed=4)
    run(processor, config, queue, now=T0 + 200)

    sessions_du_20 = {s.code: s for s in queue.sessions_for_day("2026-10-20")}
    assert "K7M2QP" not in sessions_du_20  # aucune seconde galerie n'est ouverte
    assert sessions_du_20["ORPHAN"].photo_count == 1

    # La galerie de la premiere famille n'a pas bouge d'un cheveu.
    assert queue.sessions_for_day(JOUR)[0].photo_count == 1
    assert queue.get(premiere).session_id != queue.get(seconde).session_id

    alertes = [e for e in queue.events() if e["kind"] == "card_quarantine"]
    assert len(alertes) == 1
    assert "trop tot" in alertes[0]["message"]


def test_carte_reutilisee_apres_expiration_ouvre_bien_une_session(config, queue, processor):
    """Passe la duree de vie, la carte reprend du service normalement."""
    make_card(config.watch_dir / "DSC00001.JPG", "K7M2QP", datetime(2026, 10, 15, 10, 0))
    make_photo(config.watch_dir / "DSC00002.JPG", datetime(2026, 10, 15, 10, 5), seed=2)
    run(processor, config, queue)

    # 40 jours plus tard : la galerie du 15 octobre a expire.
    make_card(config.watch_dir / "DSC00003.JPG", "K7M2QP", datetime(2026, 11, 24, 9, 0))
    make_photo(config.watch_dir / "DSC00004.JPG", datetime(2026, 11, 24, 9, 5), seed=4)
    run(processor, config, queue, now=T0 + 400)

    sessions = {s.code: s for s in queue.sessions_for_day("2026-11-24")}
    assert sessions["K7M2QP"].photo_count == 1
    assert "ORPHAN" not in sessions
    assert not [e for e in queue.events() if e["kind"] == "card_quarantine"]
