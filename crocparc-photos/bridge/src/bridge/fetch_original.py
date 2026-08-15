"""Endpoint `POST /fetch-original` : pousse un original vendu vers R2.

Les originaux restent au parc. Quand une commande est payee, le webhook Stripe
appelle cet endpoint avec la liste des chemins achetes ; le pont les depose dans
le bucket prive et renvoie leurs cles, a partir desquelles la Function fabrique
les URLs signees de telechargement.

Ce serveur est le seul point du pont exposable sur Internet. Il est donc :
- authentifie par HMAC-SHA256, meme secret partage que `/api/ingest` ;
- limite a un horodatage de moins de 5 minutes ;
- strictement cloisonne dans ORIGINALS_DIR, sans echappatoire par `..`.

Exposition recommandee : un tunnel Cloudflare vers 127.0.0.1:8788, ce qui evite
d'ouvrir un port sur le routeur du parc.
"""

from __future__ import annotations

import json
import logging
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path, PurePosixPath

from .config import Config
from .signing import SIGNATURE_HEADER, TIMESTAMP_HEADER, SignatureError, verify
from .uploader import Storage, StorageError

log = logging.getLogger(__name__)

#: Corps de requete au-dela duquel on ne lit meme pas.
MAX_BODY_BYTES = 64 * 1024
#: Nombre maximal d'originaux pousses en un appel.
MAX_PATHS = 200


class FetchError(RuntimeError):
    """Demande refusee, avec le code HTTP a renvoyer."""

    def __init__(self, status: int, message: str) -> None:
        super().__init__(message)
        self.status = status


def resolve_original(originals_dir: Path, relative: str) -> Path:
    """Traduit un chemin relatif de la base en chemin local, sans echappatoire.

    Le chemin vient de la base D1, donc d'un systeme distant : on ne lui fait
    aucune confiance. Tout ce qui n'est pas un chemin relatif simple sous
    ORIGINALS_DIR est refuse.
    """
    if not relative or not isinstance(relative, str):
        raise FetchError(400, "chemin vide")
    candidate = PurePosixPath(relative.replace("\\", "/"))
    if candidate.is_absolute() or any(part in ("..", "") for part in candidate.parts):
        raise FetchError(400, f"chemin refuse : {relative}")
    # Les chemins Windows du type C:\... passent par la case lettre de lecteur.
    if ":" in candidate.parts[0]:
        raise FetchError(400, f"chemin refuse : {relative}")

    racine = originals_dir.resolve()
    cible = (racine / Path(*candidate.parts)).resolve()
    if racine not in cible.parents:
        raise FetchError(400, f"chemin hors de ORIGINALS_DIR : {relative}")
    if not cible.is_file():
        raise FetchError(404, f"original introuvable : {relative}")
    return cible


def push_originals(
    config: Config, storage: Storage, chemins: list[str]
) -> dict[str, dict]:
    """Depose les originaux demandes sur R2 et retourne leurs cles."""
    if not isinstance(chemins, list) or not chemins:
        raise FetchError(400, "champ 'paths' attendu, liste non vide")
    if len(chemins) > MAX_PATHS:
        raise FetchError(400, f"trop de chemins demandes (max {MAX_PATHS})")

    resultat: dict[str, dict] = {}
    for relatif in chemins:
        source = resolve_original(config.originals_dir, relatif)
        # La cle vient du chemin normalise, pas de la chaine recue : sinon
        # `a/./b.jpg`, `a//b.jpg` et `a\\b.jpg` designent le meme fichier et
        # produisent trois objets R2 differents, donc trois fois l'egress.
        cle = "originals/" + "/".join(
            PurePosixPath(relatif.replace("\\", "/")).parts
        )
        if not storage.exists(config.originals_bucket, cle):
            try:
                storage.put(source, config.originals_bucket, cle)
            except StorageError as exc:
                raise FetchError(502, str(exc)) from exc
            log.info("original pousse vers R2", extra={"key": cle, "bytes": source.stat().st_size})
        resultat[relatif] = {"key": cle, "bytes": source.stat().st_size}
    return resultat


class FetchServer:
    """Petit serveur HTTP dedie, distinct de celui des compteurs de sante."""

    def __init__(self, config: Config, storage: Storage) -> None:
        self.config = config
        self.storage = storage
        self._server: ThreadingHTTPServer | None = None
        self._thread: threading.Thread | None = None

    def start(self) -> None:
        service = self

        class Handler(BaseHTTPRequestHandler):
            protocol_version = "HTTP/1.1"
            # Sans delai, une connexion ouverte et muette immobilise un thread
            # pour toujours -- et la signature n'est verifiee qu'apres lecture
            # du corps, donc n'importe qui peut en ouvrir autant qu'il veut.
            timeout = 15

            def _repondre(self, status: int, payload: dict) -> None:
                body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
                self.send_response(status)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)

            def do_POST(self) -> None:  # noqa: N802 - impose par BaseHTTPRequestHandler
                if self.path.rstrip("/") != "/fetch-original":
                    self._repondre(404, {"error": "route inconnue"})
                    return
                try:
                    longueur = int(self.headers.get("Content-Length") or 0)
                except ValueError:
                    self._repondre(400, {"error": "Content-Length illisible"})
                    return
                if longueur <= 0 or longueur > MAX_BODY_BYTES:
                    self._repondre(413, {"error": "corps absent ou trop volumineux"})
                    return

                body = self.rfile.read(longueur)
                try:
                    verify(
                        service.config.shared_secret,
                        body,
                        self.headers.get(TIMESTAMP_HEADER),
                        self.headers.get(SIGNATURE_HEADER),
                    )
                except SignatureError as exc:
                    log.warning("appel refuse", extra={"raison": str(exc)})
                    self._repondre(401, {"error": "signature invalide"})
                    return

                try:
                    demande = json.loads(body)
                    resultat = push_originals(
                        service.config, service.storage, demande.get("paths")
                    )
                except json.JSONDecodeError:
                    self._repondre(400, {"error": "JSON illisible"})
                except FetchError as exc:
                    log.warning("demande refusee", extra={"raison": str(exc), "status": exc.status})
                    self._repondre(exc.status, {"error": str(exc)})
                except Exception as exc:  # noqa: BLE001 - toujours repondre
                    # Un corps JSON valide mais inattendu (une liste, une chaine)
                    # ne doit pas couper la connexion sans reponse : l'appelant
                    # attendrait jusqu'a son propre delai.
                    log.exception("erreur inattendue", extra={"error": str(exc)})
                    self._repondre(400, {"error": "demande invalide"})
                else:
                    self._repondre(200, {"originals": resultat})

            def log_message(self, *_args) -> None:
                """Silence : les acces sont deja journalises en JSON."""

        self._server = ThreadingHTTPServer(
            (self.config.fetch_host, self.config.fetch_port), Handler
        )
        self._thread = threading.Thread(
            target=self._server.serve_forever, name="fetch-original", daemon=True
        )
        self._thread.start()
        log.info(
            "endpoint /fetch-original demarre",
            extra={"host": self.config.fetch_host, "port": self.config.fetch_port},
        )

    def stop(self) -> None:
        if self._server is not None:
            self._server.shutdown()
            self._server.server_close()
        if self._thread is not None:
            self._thread.join(timeout=5)
