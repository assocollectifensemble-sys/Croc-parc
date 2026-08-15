/**
 * POST /api/ingest, teste contre le vrai SQL des migrations.
 *
 * Le point le plus important est l'idempotence : le pont rejoue apres chaque
 * coupure reseau, et rejouer ne doit jamais dupliquer une photo ni gonfler un
 * compteur.
 */

import { beforeEach, describe, expect, it } from "vitest"
import { onRequestPost } from "../api/ingest"
import { SIGNATURE_HEADER, TIMESTAMP_HEADER, sign } from "../_lib/signing"
import { FakeD1 } from "./fake-d1"

const SECRET = "un-secret-partage-de-plus-de-32-caracteres"
const MIGRATION = new URL("../../db/migrations/0001_init.sql", import.meta.url).pathname

let db: FakeD1
let env: any

beforeEach(() => {
  db = new FakeD1()
  db.migrate(MIGRATION)
  env = { DB: db, BRIDGE_SHARED_SECRET: SECRET, SESSION_TTL_DAYS: "30" }
})

function charge(surcharge: Record<string, unknown> = {}) {
  return {
    code: "K7M2QP",
    card_number: 427,
    session_date: "2026-10-15",
    photos: [
      {
        filename: "DSC01234.JPG",
        shot_at: "2026-10-15T10:32:14+04:00",
        preview_key: "2026-10-15/K7M2QP/DSC01234_p.jpg",
        thumb_key: "2026-10-15/K7M2QP/DSC01234_t.jpg",
        original_path: "2026-10-15/K7M2QP/DSC01234.JPG",
        width: 2048,
        height: 1365,
      },
    ],
    ...surcharge,
  }
}

async function appeler(corps: unknown, options: { secret?: string; timestamp?: number } = {}) {
  const brut = JSON.stringify(corps)
  const { timestamp, signature } = await sign(options.secret ?? SECRET, brut, options.timestamp)
  const request = new Request("https://photos.crocparc.re/api/ingest", {
    method: "POST",
    body: brut,
    headers: {
      "Content-Type": "application/json",
      [TIMESTAMP_HEADER]: timestamp,
      [SIGNATURE_HEADER]: signature,
    },
  })
  return onRequestPost({ request, env } as any) as Promise<Response>
}

const compter = (table: string) =>
  db.db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as { n: number }

describe("authentification", () => {
  it("refuse une requete non signee", async () => {
    const request = new Request("https://photos.crocparc.re/api/ingest", {
      method: "POST",
      body: JSON.stringify(charge()),
    })
    const reponse = (await onRequestPost({ request, env } as any)) as Response
    expect(reponse.status).toBe(401)
    expect(compter("sessions").n).toBe(0)
  })

  it("refuse une signature faite avec un autre secret", async () => {
    const reponse = await appeler(charge(), { secret: "mauvais-secret" })
    expect(reponse.status).toBe(401)
  })

  it("refuse un horodatage vieux de plus de 5 minutes", async () => {
    const vieux = Math.floor(Date.now() / 1000) - 400
    expect((await appeler(charge(), { timestamp: vieux })).status).toBe(401)
  })

  it("refuse un corps altere apres signature", async () => {
    const brut = JSON.stringify(charge())
    const { timestamp, signature } = await sign(SECRET, brut)
    const request = new Request("https://photos.crocparc.re/api/ingest", {
      method: "POST",
      body: brut.replace("K7M2QP", "Q4RT5Y"),
      headers: { [TIMESTAMP_HEADER]: timestamp, [SIGNATURE_HEADER]: signature },
    })
    expect(((await onRequestPost({ request, env } as any)) as Response).status).toBe(401)
  })
})

describe("enregistrement", () => {
  it("cree la session et ses photos", async () => {
    const reponse = await appeler(charge())
    expect(reponse.status).toBe(200)
    const corps = (await reponse.json()) as any
    expect(corps).toMatchObject({ inserted: 1, skipped: 0, session_created: true })

    const session = db.db
      .prepare("SELECT * FROM sessions WHERE code = ?")
      .get("K7M2QP") as any
    expect(session.session_date).toBe("2026-10-15")
    expect(session.card_number).toBe(427)
    expect(session.photo_count).toBe(1)
    expect(session.status).toBe("active")
    // expires_at se calcule depuis la DATE DE VISITE, pas depuis l'instant
    // d'ingestion : une declaration retardee ne doit pas prolonger la galerie
    // au-dela de la fenetre de quarantaine du pont.
    expect(session.expires_at.slice(0, 10)).toBe("2026-11-14")

    const photo = db.db.prepare("SELECT * FROM photos").get() as any
    expect(photo.original_path).toBe("2026-10-15/K7M2QP/DSC01234.JPG")
    expect(photo.width).toBe(2048)
  })

  it("rejouer la meme charge utile ne duplique rien", async () => {
    await appeler(charge())
    const deuxieme = await appeler(charge())
    const troisieme = await appeler(charge())

    expect(((await deuxieme.json()) as any)).toMatchObject({ inserted: 0, skipped: 1 })
    expect(((await troisieme.json()) as any).session_created).toBe(false)
    expect(compter("sessions").n).toBe(1)
    expect(compter("photos").n).toBe(1)
    const session = db.db.prepare("SELECT photo_count FROM sessions").get() as any
    expect(session.photo_count).toBe(1)
  })

  it("ajoute les photos manquantes d'un lot deja partiellement recu", async () => {
    await appeler(charge())
    const suite = charge({
      photos: [
        charge().photos[0],
        {
          filename: "DSC01235.JPG",
          shot_at: "2026-10-15T10:33:02+04:00",
          preview_key: "2026-10-15/K7M2QP/DSC01235_p.jpg",
          thumb_key: "2026-10-15/K7M2QP/DSC01235_t.jpg",
          original_path: "2026-10-15/K7M2QP/DSC01235.JPG",
          width: 2048,
          height: 1365,
        },
      ],
    })
    expect(((await (await appeler(suite)).json()) as any)).toMatchObject({
      inserted: 1,
      skipped: 1,
    })
    expect(compter("photos").n).toBe(2)
    expect((db.db.prepare("SELECT photo_count FROM sessions").get() as any).photo_count).toBe(2)
  })

  it("une carte reutilisee un autre jour ouvre une session neuve", async () => {
    await appeler(charge())
    await appeler(charge({ session_date: "2026-10-16" }))
    expect(compter("sessions").n).toBe(2)
  })

  it("accepte une session sans photo (deux cartes consecutives)", async () => {
    const reponse = await appeler(charge({ photos: [] }))
    expect(reponse.status).toBe(200)
    expect((db.db.prepare("SELECT photo_count FROM sessions").get() as any).photo_count).toBe(0)
  })

  it("marque les sessions orphelines", async () => {
    await appeler(charge({ code: "ORPHAN", card_number: null }))
    expect((db.db.prepare("SELECT status FROM sessions").get() as any).status).toBe("orphan")
  })

  it("complete le numero de carte manquant sans ecraser l'existant", async () => {
    await appeler(charge({ card_number: null }))
    await appeler(charge({ card_number: 427 }))
    await appeler(charge({ card_number: 999 }))
    expect((db.db.prepare("SELECT card_number FROM sessions").get() as any).card_number).toBe(427)
  })
})

describe("validation", () => {
  const refuse = async (surcharge: Record<string, unknown>) => {
    const reponse = await appeler(charge(surcharge))
    expect(reponse.status).toBe(400)
    expect(compter("sessions").n).toBe(0)
  }

  it("refuse un code hors alphabet", async () => {
    await refuse({ code: "K7M2Q0" }) // 0 et O sont exclus
  })
  it("refuse un code de mauvaise longueur", async () => refuse({ code: "K7M2Q" }))
  it("refuse une date malformee", async () => refuse({ session_date: "15/10/2026" }))
  it("refuse une date inexistante", async () => refuse({ session_date: "2026-13-45" }))
  it("refuse un tableau de photos absent", async () => refuse({ photos: "non" }))
  it("refuse une cle absolue", async () =>
    refuse({ photos: [{ ...charge().photos[0], preview_key: "/etc/passwd" }] }))
  it("refuse un chemin d'original qui remonte l'arborescence", async () =>
    refuse({ photos: [{ ...charge().photos[0], original_path: "../../secrets/cle.txt" }] }))
  it("refuse une dimension aberrante", async () =>
    refuse({ photos: [{ ...charge().photos[0], width: -1 }] }))
  it("refuse un nom de fichier vide", async () =>
    refuse({ photos: [{ ...charge().photos[0], filename: "" }] }))
})
