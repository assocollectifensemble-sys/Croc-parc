/**
 * La purge a 30 jours.
 *
 * La page d'accueil promet au visiteur que ses photos sont effacees au bout de
 * 30 jours. Ce test est ce qui rend cette phrase vraie.
 */

import { beforeEach, describe, expect, it } from "vitest"
import { purger, type Env } from "../../workers/purge/index"
import { FakeD1 } from "./fake-d1"
import { FakeR2 } from "./fake-r2"

let db: FakeD1
let previews: FakeR2
let originaux: FakeR2
let env: Env

beforeEach(() => {
  db = new FakeD1()
  for (const migration of ["0001_init.sql", "0002_rate_limits.sql"]) {
    db.migrate(new URL(`../../db/migrations/${migration}`, import.meta.url).pathname)
  }
  previews = new FakeR2()
  originaux = new FakeR2()
  env = { DB: db as any, PREVIEWS: previews as any, ORIGINALS: originaux as any }
})

function creerVisite(code: string, expiresAt: string, photos = 2) {
  const id = `session-${code}`
  db.db
    .prepare(
      `INSERT INTO sessions (id, code, session_date, created_at, expires_at, photo_count, status)
       VALUES (?, ?, '2026-10-15', '2026-10-15T08:00:00.000Z', ?, ?, 'active')`,
    )
    .run(id, code, expiresAt, photos)

  for (let index = 0; index < photos; index++) {
    const photoId = `photo-${code}-${index}`
    db.db
      .prepare(
        `INSERT INTO photos (id, session_id, filename, shot_at, preview_key, thumb_key,
                             original_path, width, height, created_at)
         VALUES (?, ?, ?, '2026-10-15T10:00:00+04:00', ?, ?, ?, 2048, 1365, '2026-10-15T08:00:00.000Z')`,
      )
      .run(
        photoId,
        id,
        `DSC0${index}.JPG`,
        `2026-10-15/opaque-${code}-${index}_p.jpg`,
        `2026-10-15/opaque-${code}-${index}_t.jpg`,
        `2026-10-15/${code}/DSC0${index}.JPG`,
      )
    previews.objets.set(`2026-10-15/opaque-${code}-${index}_p.jpg`, new Uint8Array([1]))
    previews.objets.set(`2026-10-15/opaque-${code}-${index}_t.jpg`, new Uint8Array([1]))
    originaux.objets.set(`originals/2026-10-15/${code}/DSC0${index}.JPG`, new Uint8Array([1]))
  }
  return id
}

function commandePayee(sessionId: string, jeton = "a".repeat(32)) {
  db.db
    .prepare(
      `INSERT INTO orders (id, session_id, product, photo_ids, amount_cents, status,
                           download_token, created_at, paid_at)
       VALUES (?, ?, 'pack', '["photo-1"]', 2000, 'paid', ?, '2026-10-15T12:00:00.000Z', '2026-10-15T12:01:00.000Z')`,
    )
    .run(`commande-${jeton.slice(0, 4)}`, sessionId, jeton)
}

const compter = (table: string) =>
  (db.db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as { n: number }).n

describe("purge a 30 jours", () => {
  it("efface photos et objets d'une session expiree", async () => {
    const expiree = creerVisite("K7M2QP", "2026-09-01T00:00:00.000Z")
    commandePayee(expiree)

    const bilan = await purger(env, new Date("2026-10-20T03:00:00.000Z"))

    expect(bilan.sessions).toBe(1)
    expect(bilan.photos).toBe(2)
    expect(compter("photos")).toBe(0)
    expect(previews.objets.size).toBe(0)
    expect(originaux.objets.size).toBe(0)

    const session = db.db.prepare("SELECT * FROM sessions").get() as any
    expect(session.status).toBe("purged")
    expect(session.photo_count).toBe(0)
  })

  it("revoque les liens de telechargement sans effacer la trace comptable", async () => {
    const expiree = creerVisite("K7M2QP", "2026-09-01T00:00:00.000Z")
    commandePayee(expiree)

    await purger(env, new Date("2026-10-20T03:00:00.000Z"))

    const commande = db.db.prepare("SELECT * FROM orders").get() as any
    expect(commande.download_token).toBeNull()
    expect(commande.amount_cents).toBe(2000) // la vente reste dans les comptes
    expect(commande.status).toBe("paid")
  })

  it("ne touche pas a une session encore valide", async () => {
    creerVisite("Q4RT5Y", "2026-11-30T00:00:00.000Z", 3)
    const bilan = await purger(env, new Date("2026-10-20T03:00:00.000Z"))

    expect(bilan.sessions).toBe(0)
    expect(compter("photos")).toBe(3)
    expect(previews.objets.size).toBe(6)
    expect((db.db.prepare("SELECT status FROM sessions").get() as any).status).toBe("active")
  })

  it("trie correctement quand les deux cohabitent", async () => {
    creerVisite("K7M2QP", "2026-09-01T00:00:00.000Z", 2)
    creerVisite("Q4RT5Y", "2026-11-30T00:00:00.000Z", 3)

    await purger(env, new Date("2026-10-20T03:00:00.000Z"))

    expect(compter("photos")).toBe(3)
    const restantes = db.db.prepare("SELECT session_id FROM photos").all() as any[]
    expect(new Set(restantes.map((p) => p.session_id))).toEqual(new Set(["session-Q4RT5Y"]))
  })

  it("est rejouable : deux passages ne changent rien de plus", async () => {
    creerVisite("K7M2QP", "2026-09-01T00:00:00.000Z")
    await purger(env, new Date("2026-10-20T03:00:00.000Z"))
    const second = await purger(env, new Date("2026-10-20T03:00:00.000Z"))
    expect(second.sessions).toBe(0)
    expect(second.photos).toBe(0)
  })

  it("efface les compteurs de limitation de debit perimes", async () => {
    const recent = Math.floor(new Date("2026-10-20T02:00:00.000Z").getTime() / 1000)
    const vieux = Math.floor(new Date("2026-10-01T00:00:00.000Z").getTime() / 1000)
    db.db.prepare("INSERT INTO rate_limits (bucket, window_start, count) VALUES ('a', ?, 3)").run(recent)
    db.db.prepare("INSERT INTO rate_limits (bucket, window_start, count) VALUES ('b', ?, 9)").run(vieux)

    const bilan = await purger(env, new Date("2026-10-20T03:00:00.000Z"))

    expect(bilan.limitations).toBe(1)
    expect(compter("rate_limits")).toBe(1)
  })

  it("une erreur R2 n'arrete pas la purge", async () => {
    creerVisite("K7M2QP", "2026-09-01T00:00:00.000Z", 2)
    previews.delete = async () => {
      throw new Error("R2 indisponible")
    }

    const bilan = await purger(env, new Date("2026-10-20T03:00:00.000Z"))

    expect(bilan.erreurs.length).toBe(4) // deux photos, preview + vignette
    expect(bilan.sessions).toBe(1) // la session est tout de meme purgee
    expect(compter("photos")).toBe(0)
  })

  it("traite plus de sessions que la taille d'un lot", async () => {
    for (let index = 0; index < 60; index++) {
      creerVisite(`CODE${index}`, "2026-09-01T00:00:00.000Z", 1)
    }
    const bilan = await purger(env, new Date("2026-10-20T03:00:00.000Z"))
    expect(bilan.sessions).toBe(60)
    expect(compter("photos")).toBe(0)
  })
})
