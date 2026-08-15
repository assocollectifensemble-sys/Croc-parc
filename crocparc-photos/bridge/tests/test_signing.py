"""Signature HMAC : le pont et les Functions doivent produire le meme resultat.

Le vecteur de test ci-dessous est le verrou entre les deux implementations. Il
figure a l'identique dans functions/__tests__/signing.test.ts. Si l'un des deux
cotes change de schema, un des deux tests tombe.
"""

from __future__ import annotations

import pytest

from bridge.signing import MAX_SKEW_SECONDS, SignatureError, sign, verify

SECRET = "secret-de-test"
BODY = b'{"a":1}'
TIMESTAMP = 1760000000
SIGNATURE = "74389136ccba8de4a5535bcb1761ebb2219b97cc1f4b11a027988d1a8e7c03d3"


def test_vecteur_de_test_commun():
    horodatage, signature = sign(SECRET, BODY, timestamp=TIMESTAMP)
    assert horodatage == str(TIMESTAMP)
    assert signature == SIGNATURE


def test_verification_d_une_signature_valide():
    verify(SECRET, BODY, str(TIMESTAMP), SIGNATURE, now=TIMESTAMP + 60)


def test_aller_retour():
    horodatage, signature = sign(SECRET, b"n'importe quel corps")
    verify(SECRET, b"n'importe quel corps", horodatage, signature)


@pytest.mark.parametrize(
    "corps,horodatage,signature,maintenant,motif",
    [
        (b'{"a":2}', str(TIMESTAMP), SIGNATURE, TIMESTAMP, "invalide"),
        (BODY, str(TIMESTAMP), SIGNATURE, TIMESTAMP + MAX_SKEW_SECONDS + 1, "fenetre"),
        (BODY, str(TIMESTAMP), SIGNATURE, TIMESTAMP - MAX_SKEW_SECONDS - 1, "fenetre"),
        # Horodatage remplace dans la fenetre : c'est ce que signer
        # `timestamp.corps` empeche, contrairement a signer le corps seul.
        (BODY, str(TIMESTAMP + 10), SIGNATURE, TIMESTAMP + 10, "invalide"),
        (BODY, None, SIGNATURE, TIMESTAMP, "manquants"),
        (BODY, str(TIMESTAMP), None, TIMESTAMP, "manquants"),
        (BODY, "hier", SIGNATURE, TIMESTAMP, "illisible"),
        (BODY, str(TIMESTAMP), "pas-du-hexa", TIMESTAMP, "invalide"),
    ],
)
def test_signatures_refusees(corps, horodatage, signature, maintenant, motif):
    with pytest.raises(SignatureError, match=motif):
        verify(SECRET, corps, horodatage, signature, now=maintenant)


def test_secret_different():
    with pytest.raises(SignatureError):
        verify("autre-secret", BODY, str(TIMESTAMP), SIGNATURE, now=TIMESTAMP)


def test_refus_sans_secret():
    with pytest.raises(SignatureError, match="vide"):
        sign("", BODY)
    with pytest.raises(SignatureError, match="non configure"):
        verify("", BODY, str(TIMESTAMP), SIGNATURE, now=TIMESTAMP)
