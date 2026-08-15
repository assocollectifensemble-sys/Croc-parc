/**
 * La signature doit etre identique des deux cotes du fil : le pont signe en
 * Python, la Function verifie en TypeScript. Le vecteur ci-dessous est le
 * verrou -- il figure a l'identique dans bridge/tests/test_signing.py. S'il
 * casse d'un cote, les deux implementations ont divergé.
 */

import { describe, expect, it } from "vitest"
import { SignatureError, sign, verify } from "../_lib/signing"

const SECRET = "secret-de-test"
const BODY = '{"a":1}'
const TIMESTAMP = 1760000000
const SIGNATURE = "74389136ccba8de4a5535bcb1761ebb2219b97cc1f4b11a027988d1a8e7c03d3"

describe("signature partagee avec le pont", () => {
  it("reproduit le vecteur de test commun", async () => {
    const { signature } = await sign(SECRET, BODY, TIMESTAMP)
    expect(signature).toBe(SIGNATURE)
  })

  it("accepte une signature produite par le pont", async () => {
    await expect(
      verify(SECRET, BODY, String(TIMESTAMP), SIGNATURE, TIMESTAMP + 60),
    ).resolves.toBeUndefined()
  })

  it("refuse un corps modifie", async () => {
    await expect(
      verify(SECRET, '{"a":2}', String(TIMESTAMP), SIGNATURE, TIMESTAMP),
    ).rejects.toThrow(SignatureError)
  })

  it("refuse un secret different", async () => {
    await expect(
      verify("autre-secret", BODY, String(TIMESTAMP), SIGNATURE, TIMESTAMP),
    ).rejects.toThrow(SignatureError)
  })

  it("refuse un horodatage trop ancien", async () => {
    await expect(
      verify(SECRET, BODY, String(TIMESTAMP), SIGNATURE, TIMESTAMP + 301),
    ).rejects.toThrow(/hors fenetre/)
  })

  it("refuse un horodatage trop en avance", async () => {
    await expect(
      verify(SECRET, BODY, String(TIMESTAMP), SIGNATURE, TIMESTAMP - 301),
    ).rejects.toThrow(/hors fenetre/)
  })

  it("refuse un horodatage remplace, meme dans la fenetre", async () => {
    // C'est tout l'interet de signer `timestamp.corps` plutot que le corps seul.
    await expect(
      verify(SECRET, BODY, String(TIMESTAMP + 10), SIGNATURE, TIMESTAMP + 10),
    ).rejects.toThrow(SignatureError)
  })

  it("refuse les en-tetes absents ou malformes", async () => {
    await expect(verify(SECRET, BODY, null, SIGNATURE)).rejects.toThrow(/manquants/)
    await expect(verify(SECRET, BODY, String(TIMESTAMP), null)).rejects.toThrow(/manquants/)
    await expect(
      verify(SECRET, BODY, "hier", SIGNATURE, TIMESTAMP),
    ).rejects.toThrow(/illisible/)
    await expect(
      verify(SECRET, BODY, String(TIMESTAMP), "pas-du-hexa", TIMESTAMP),
    ).rejects.toThrow(/malformee/)
  })

  it("refuse de signer sans secret", async () => {
    await expect(sign("", BODY)).rejects.toThrow(SignatureError)
    await expect(verify("", BODY, String(TIMESTAMP), SIGNATURE, TIMESTAMP)).rejects.toThrow(
      /non configure/,
    )
  })
})
