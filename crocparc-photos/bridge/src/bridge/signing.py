"""Signature HMAC partagee entre le pont et les Functions Cloudflare.

Le meme schema sert dans les deux sens :

- le pont signe ce qu'il envoie a `POST /api/ingest` ;
- les Functions signent ce qu'elles envoient a `POST /fetch-original` sur le pont.

On signe `timestamp.corps_brut` et non le corps seul : sans ca, un horodatage
peut etre remplace sans invalider la signature, et la fenetre de 5 minutes ne
protege plus de rien. Meme approche que les webhooks Stripe.
"""

from __future__ import annotations

import hashlib
import hmac
import time

TIMESTAMP_HEADER = "X-Bridge-Timestamp"
SIGNATURE_HEADER = "X-Bridge-Signature"
#: Ecart maximal tolere entre l'horodatage recu et l'heure locale.
MAX_SKEW_SECONDS = 300


class SignatureError(RuntimeError):
    """Signature absente, malformee, perimee ou fausse."""


def sign(secret: str, body: bytes, timestamp: int | None = None) -> tuple[str, str]:
    """Retourne (horodatage, signature hexadecimale) pour un corps brut."""
    if not secret:
        raise SignatureError("secret partage vide : refus de signer")
    stamp = str(int(time.time()) if timestamp is None else timestamp)
    digest = hmac.new(
        secret.encode("utf-8"),
        stamp.encode("ascii") + b"." + body,
        hashlib.sha256,
    ).hexdigest()
    return stamp, digest


def verify(
    secret: str,
    body: bytes,
    timestamp: str | None,
    signature: str | None,
    now: float | None = None,
    max_skew: int = MAX_SKEW_SECONDS,
) -> None:
    """Leve SignatureError si la requete n'est pas authentique ou trop ancienne."""
    if not secret:
        raise SignatureError("secret partage non configure")
    if not timestamp or not signature:
        raise SignatureError("en-tetes de signature manquants")
    try:
        stamp = int(timestamp)
    except ValueError as exc:
        raise SignatureError("horodatage illisible") from exc

    maintenant = time.time() if now is None else now
    if abs(maintenant - stamp) > max_skew:
        raise SignatureError(
            f"horodatage hors fenetre ({abs(int(maintenant - stamp))} s d'ecart)"
        )

    attendu = hmac.new(
        secret.encode("utf-8"),
        str(stamp).encode("ascii") + b"." + body,
        hashlib.sha256,
    ).hexdigest()
    if not hmac.compare_digest(attendu, signature.strip().lower()):
        raise SignatureError("signature invalide")
