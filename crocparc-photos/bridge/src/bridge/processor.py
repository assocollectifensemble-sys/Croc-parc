"""Machine a etats : d'un JPEG depose par le FTP a une photo publiable.

discovered -> stable -> analyzed -> processed -> uploaded -> registered -> done

Chaque etape est idempotente et rejouable : un plantage entre deux etapes ne
laisse jamais qu'un travail a refaire, jamais un doublon. Toutes les erreurs sont
comptees et rejouees avec un backoff exponentiel plafonne.
"""

from __future__ import annotations

import logging
import time
from datetime import datetime, timedelta
from pathlib import Path

from .config import Config
from .imaging import (
    copy_verified,
    sha1_of,
    make_preview,
    make_thumbnail,
    open_oriented,
    read_metadata,
)
from .models import FileRow, FileState, SessionRow, SessionStatus
from .qr import ORPHAN_CODE, detect_card, load_inventory
from .queue import Queue
from .uploader import Registrar, Storage

log = logging.getLogger(__name__)

#: Etats depuis lesquels une photo peut encore changer de session sans degat.
REASSIGNABLE = (FileState.PROCESSED, FileState.UPLOADED)


class Processor:
    def __init__(
        self,
        config: Config,
        queue: Queue,
        storage: Storage,
        registrar: Registrar,
    ) -> None:
        self.config = config
        self.queue = queue
        self.storage = storage
        self.registrar = registrar
        self.inventory = load_inventory(config.cards_inventory_csv)

    # -- boucle -------------------------------------------------------------
    def tick(self, now: float | None = None) -> int:
        """Fait avancer d'un cran tout ce qui est pret. Retourne le nombre de pas.

        L'ordre des etapes compte : on analyse tout avant de ranger quoi que ce
        soit, pour qu'une carte arrivee dans le meme lot que ses photos soit
        connue au moment ou celles-ci cherchent leur session.
        """
        now = time.time() if now is None else now
        steps = 0
        steps += self._run(FileState.DISCOVERED, self._stabilize, now)
        steps += self._run(FileState.STABLE, self._analyze, now)
        steps += self._run(FileState.ANALYZED, self._process, now, cards_first=True)
        steps += self._run(FileState.PROCESSED, self._upload, now)
        steps += self._register_uploaded(now)
        return steps

    def drain(self, max_rounds: int = 100, now: float | None = None) -> int:
        """Fait tourner la machine jusqu'a ce que plus rien ne bouge."""
        total = 0
        for _ in range(max_rounds):
            steps = self.tick(now=now)
            total += steps
            if steps == 0:
                break
        return total

    def _run(
        self,
        state: FileState,
        handler,
        now: float,
        cards_first: bool = False,
    ) -> int:
        rows = self.queue.ready((state,), now)
        if cards_first:
            rows.sort(key=lambda row: (not row.is_card, row.shot_at or "", row.filename))
        steps = 0
        for row in rows:
            try:
                if handler(row, now):
                    steps += 1
            except Exception as exc:  # noqa: BLE001 - aucune erreur ne doit tuer la boucle
                self._on_error(row, exc, now)
        return steps

    def _on_error(self, row: FileRow, exc: Exception, now: float) -> None:
        attempts = self.queue.fail(
            row.path,
            f"{type(exc).__name__}: {exc}",
            now,
            self.config.base_backoff,
            self.config.max_backoff,
            self.config.max_attempts,
        )
        quarantined = 0 < self.config.max_attempts <= attempts
        log.log(
            logging.ERROR if quarantined else logging.WARNING,
            "echec de traitement",
            extra={
                "file": row.filename,
                "state": row.state.value,
                "attempts": attempts,
                "error": f"{type(exc).__name__}: {exc}",
                "quarantined": quarantined,
            },
        )
        if quarantined:
            self.queue.record_event(
                "quarantine", f"{row.filename}: {type(exc).__name__}: {exc}", row.path
            )

    # -- etapes -------------------------------------------------------------
    def _stabilize(self, row: FileRow, now: float) -> bool:
        """Un fichier n'est stable que si sa taille n'a pas bouge pendant N secondes.

        Le FTP ecrit progressivement : traiter trop tot donne un JPEG tronque.
        """
        try:
            size = row.path.stat().st_size
        except FileNotFoundError:
            log.info("fichier disparu avant traitement", extra={"file": row.filename})
            self.queue.update(row.path, state=FileState.FAILED, last_error="disparu")
            return True

        if size == 0:
            self.queue.update(row.path, size=size, last_size=size, stable_since=now)
            return False

        if row.last_size == size and row.stable_since is not None:
            if now - row.stable_since >= self.config.stable_seconds:
                self.queue.update(row.path, state=FileState.STABLE, size=size)
                return True
            return False

        self.queue.update(row.path, size=size, last_size=size, stable_since=now)
        return False

    def _analyze(self, row: FileRow, now: float) -> bool:
        """Lit les metadonnees et decide : carte separatrice ou photo de visiteur."""
        with open_oriented(row.path) as image:
            metadata = read_metadata(row.path, image)
            card = detect_card(image, self.config.qr_scan_max_edge)

        shot_at = self._shot_at_iso(metadata.shot_at, row.path)
        if metadata.has_gps:
            log.warning(
                "coordonnees GPS presentes dans l'original",
                extra={"file": row.filename},
            )
            self.queue.record_event(
                "gps_present",
                f"{row.filename}: GPS present dans l'original (retire des previews)",
                row.path,
            )

        fields = {
            "state": FileState.ANALYZED,
            "shot_at": shot_at,
            "width": metadata.width,
            "height": metadata.height,
            "is_card": 1 if card else 0,
            "code": card.code if card else None,
            "card_number": self._card_number(card) if card else None,
        }
        self.queue.update(row.path, **fields)
        self.queue.clear_error(row.path)
        log.info(
            "photo analysee",
            extra={
                "file": row.filename,
                "is_card": bool(card),
                "code": card.code if card else None,
                "shot_at": shot_at,
            },
        )
        return True

    def _process(self, row: FileRow, now: float) -> bool:
        return self._process_card(row) if row.is_card else self._process_photo(row)

    def _process_card(self, row: FileRow) -> bool:
        """Ouvre une session et met la photo de la carte de cote, jamais publiee."""
        assert row.code and row.shot_at
        session_date = row.shot_at[:10]
        session = self.queue.get_or_create_session(
            code=row.code,
            session_date=session_date,
            ttl_days=self.config.session_ttl_days,
            card_number=row.card_number,
            opened_at=row.shot_at,
        )
        destination = (
            self.config.archive_dir / "cards" / session_date / f"{row.code}-{row.filename}"
        )
        sha1 = copy_verified(row.path, destination)
        self._warn_if_card_reused(row, session_date)
        # La carte ne recoit ni preview, ni vignette, ni cle R2 : elle s'arrete ici.
        self.queue.update(row.path, state=FileState.DONE, session_id=session.id, sha1=sha1)
        self.queue.clear_error(row.path)
        self._reassign_after_card(session, row.shot_at)
        return True

    def _process_photo(self, row: FileRow) -> bool:
        """Rattache la photo a sa session, fabrique preview et vignette."""
        assert row.shot_at
        session = self._session_for(row)
        filename = self._free_filename(session.id, row)
        stem = Path(filename).stem
        prefix = f"{session.session_date}/{session.code}"

        preview_key = f"{prefix}/{stem}_p.jpg"
        thumb_key = f"{prefix}/{stem}_t.jpg"
        original_key = f"{prefix}/{filename}"

        with open_oriented(row.path) as image:
            width, height = make_preview(
                image,
                self.config.work_dir / preview_key,
                self.config.preview_max_edge,
                self.config.preview_quality,
                self.config.watermark,
            )
            make_thumbnail(
                image,
                self.config.work_dir / thumb_key,
                self.config.thumb_max_edge,
                self.config.thumb_quality,
                self.config.watermark,
            )

        # Archive locale de l'original, copie verifiee par empreinte.
        archive_path = self.config.archive_dir / session.session_date / session.code / filename
        sha1 = copy_verified(row.path, archive_path)

        self.queue.update(
            row.path,
            state=FileState.PROCESSED,
            session_id=session.id,
            filename=filename,
            preview_key=preview_key,
            thumb_key=thumb_key,
            original_key=original_key,
            width=width,
            height=height,
            sha1=sha1,
        )
        self.queue.clear_error(row.path)
        log.info(
            "photo traitee",
            extra={
                "file": filename,
                "code": session.code,
                "preview": f"{width}x{height}",
            },
        )
        return True

    def _upload(self, row: FileRow, now: float) -> bool:
        """Depose previews et original sur le stockage objet (local en phase A)."""
        assert row.session_id and row.preview_key and row.thumb_key and row.original_key
        archive_path = self._archive_path(row)
        assert archive_path is not None
        preview = self.config.work_dir / row.preview_key
        thumb = self.config.work_dir / row.thumb_key
        self.storage.put(preview, self.config.previews_bucket, row.preview_key)
        self.storage.put(thumb, self.config.previews_bucket, row.thumb_key)
        self.storage.put(archive_path, self.config.originals_bucket, row.original_key)
        self.queue.update(row.path, state=FileState.UPLOADED)
        self.queue.clear_error(row.path)
        self.queue.refresh_photo_count(row.session_id)
        # Le dossier de travail n'est qu'un sas : une fois les derives deposes,
        # ils n'ont plus de raison d'occuper le disque du mini-PC.
        preview.unlink(missing_ok=True)
        thumb.unlink(missing_ok=True)
        return True

    def _archive_path(self, row: FileRow) -> Path | None:
        """Ou l'original (ou la photo de carte) est archive localement."""
        if not row.session_id:
            return None
        session = self.queue.session(row.session_id)
        if session is None:  # pragma: no cover - incoherence de base
            return None
        if row.is_card:
            return (
                self.config.archive_dir
                / "cards"
                / session.session_date
                / f"{session.code}-{row.filename}"
            )
        return self.config.archive_dir / session.session_date / session.code / row.filename

    def _register_uploaded(self, now: float) -> int:
        """Declare les photos deposees, groupees par session (contrat /api/ingest)."""
        rows = self.queue.ready((FileState.UPLOADED,), now)
        by_session: dict[str, list[FileRow]] = {}
        for row in rows:
            if row.session_id:
                by_session.setdefault(row.session_id, []).append(row)

        steps = 0
        for session_id, photos in by_session.items():
            session = self.queue.session(session_id)
            if session is None:  # pragma: no cover - incoherence de base
                continue
            try:
                self.registrar.register(session, photos)
            except Exception as exc:  # noqa: BLE001 - le reseau tombe, on rejouera
                for row in photos:
                    self._on_error(row, exc, now)
                continue
            for row in photos:
                self.queue.update(row.path, state=FileState.REGISTERED)
                self.queue.clear_error(row.path)
                self.queue.update(row.path, state=FileState.DONE)
                steps += 1
            self.queue.refresh_photo_count(session_id)
        return steps

    # -- aides --------------------------------------------------------------
    def _shot_at_iso(self, shot_at: datetime | None, path: Path) -> str:
        """Horodatage ISO avec le decalage de La Reunion.

        Sans DateTimeOriginal exploitable, on retombe sur la date du fichier :
        mieux vaut une session approximative qu'une photo perdue.
        """
        if shot_at is None:
            log.warning("DateTimeOriginal absent, repli sur la date du fichier",
                        extra={"file": path.name})
            shot_at = datetime.fromtimestamp(path.stat().st_mtime)
        return shot_at.replace(tzinfo=self.config.tz).isoformat(timespec="seconds")

    def _card_number(self, card) -> int | None:
        return card.card_number or self.inventory.get(card.code)

    def _session_for(self, row: FileRow) -> SessionRow:
        assert row.shot_at
        found = self.queue.card_session_at(row.shot_at)
        if found:
            session = self.queue.session(found[0])
            if session is not None:
                return session
        # Aucune carte avant cette photo : session orpheline, visible en admin seulement.
        session_date = row.shot_at[:10]
        session = self.queue.get_or_create_session(
            code=ORPHAN_CODE,
            session_date=session_date,
            ttl_days=self.config.session_ttl_days,
            status=SessionStatus.ORPHAN,
        )
        log.warning(
            "photo sans carte, rangee en session orpheline",
            extra={"file": row.filename, "session_date": session_date},
        )
        self.queue.record_event(
            "orphan", f"{row.filename}: aucune carte avant cette photo", row.path
        )
        return session

    def _free_filename(self, session_id: str, row: FileRow) -> str:
        """Evite deux photos differentes sous le meme nom dans une session.

        Le compteur du boitier reboucle a 9999 : la collision est rare mais elle
        casserait l'idempotence de /api/ingest, qui s'appuie sur (session, nom).
        """
        if not self.queue.filename_taken(session_id, row.filename, row.path):
            return row.filename
        stem, suffix = Path(row.filename).stem, Path(row.filename).suffix
        index = 2
        while self.queue.filename_taken(session_id, f"{stem}-{index}{suffix}", row.path):
            index += 1
        candidate = f"{stem}-{index}{suffix}"
        self.queue.record_event(
            "filename_conflict", f"{row.filename} renomme en {candidate}", row.path
        )
        return candidate

    def _warn_if_card_reused(self, row: FileRow, session_date: str) -> None:
        """Signale une carte rephotographiee le meme jour.

        Une session est identifiee par (code, date) : deux groupes servis avec la
        meme carte le meme jour partagent donc la meme galerie, et chacun voit
        les photos de l'autre. Le pont ne peut pas les separer -- le code est le
        seul identifiant que le visiteur possede -- mais il ne doit pas laisser
        passer ca en silence.
        """
        assert row.code
        autres = [
            autre
            for autre in self.queue.other_card_shots(row.code, session_date, row.path)
            if (autre.shot_at or "") < (row.shot_at or "")
        ]
        if not autres:
            return  # premiere prise de vue de cette carte ce jour-la
        message = (
            f"carte {row.code} rephotographiee le {session_date} "
            f"({len(autres) + 1} fois) : les groupes partagent la meme galerie"
        )
        log.warning("carte reutilisee le meme jour", extra={"code": row.code, "fois": len(autres) + 1})
        self.queue.record_event("card_reused", message, row.path)

    def purge_inbox(self, now: float | None = None) -> int:
        """Efface de l'inbox les fichiers termines et archives depuis N jours.

        `now` est un instant de l'horloge murale (time.time()), pas la base de
        temps du backoff : la retention se compare a `updated_at`, qui est une
        date reelle.

        Ne supprime que ce qui est verifiable : l'archive locale doit exister et
        son empreinte doit correspondre a celle enregistree au traitement. Un
        doute, et le fichier reste.
        """
        if self.config.inbox_retention_days <= 0:
            return 0
        now = time.time() if now is None else now
        horizon = datetime.fromtimestamp(now).astimezone() - timedelta(
            days=self.config.inbox_retention_days
        )
        limite = horizon.isoformat(timespec="seconds")

        efface = 0
        for row in self.queue.purgeable(limite):
            if not row.path.exists():
                continue
            archive = self._archive_path(row)
            if archive is None or not archive.is_file():
                log.warning(
                    "purge annulee, archive introuvable",
                    extra={"file": row.filename},
                )
                continue
            if row.sha1 and sha1_of(archive) != row.sha1:
                log.error(
                    "purge annulee, archive differente de l'original",
                    extra={"file": row.filename, "archive": str(archive)},
                )
                self.queue.record_event(
                    "purge_conflict",
                    f"{row.filename}: archive differente de l'original, non purge",
                    row.path,
                )
                continue
            row.path.unlink()
            efface += 1
        if efface:
            log.info(
                "inbox purgee",
                extra={"count": efface, "retention_days": self.config.inbox_retention_days},
            )
            self.queue.record_event("purge", f"{efface} fichier(s) efface(s) de l'inbox")
        return efface

    def _reassign_after_card(self, session: SessionRow, card_shot_at: str) -> None:
        """Rattrape les photos rangees trop tot quand la carte arrive en retard.

        Le FTP livre normalement dans l'ordre de prise de vue, mais une reprise
        apres coupure peut inverser deux fichiers.
        """
        for row in self.queue.photos_to_reassign(card_shot_at, session.id):
            if row.state in REASSIGNABLE:
                self.queue.update(
                    row.path,
                    state=FileState.ANALYZED,
                    session_id=None,
                    preview_key=None,
                    thumb_key=None,
                    original_key=None,
                )
                log.info(
                    "photo rerangee apres arrivee tardive de la carte",
                    extra={"file": row.filename, "code": session.code},
                )
                self.queue.record_event(
                    "reassigned",
                    f"{row.filename} rerangee vers {session.code}",
                    row.path,
                )
            else:
                log.warning(
                    "carte arrivee apres une photo deja publiee",
                    extra={"file": row.filename, "code": session.code},
                )
                self.queue.record_event(
                    "reassign_conflict",
                    f"{row.filename} deja publiee, non rerangee vers {session.code}",
                    row.path,
                )
