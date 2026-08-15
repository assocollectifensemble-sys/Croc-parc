/**
 * Console d'administration.
 *
 * Elle donne acces a tout : sessions, orphelines, ventes, courriels. La seule
 * chose qui la protege est le jeton, donc c'est lui qu'on teste en premier.
 */

import { beforeEach, describe, expect, it } from "vitest"
import { onRequestGet as overview } from "../api/admin/overview"
import { FakeD1 } from "./fake-d1"

const JETON = "un-jeton-d-administration-tres-long"

let db: FakeD1
let env: any

beforeEach(() => {
  db = new FakeD1()
  for (const migration of ["0001_init.sql", "0002_rate_limits.sql"]) {
    db.migrate(new URL(`../../db/migrations/${migration}`, import.meta.url).pathname)
  }
  env = { DB: db, ADMIN_TOKEN: JETON }
})

async function demander(entetes: Record<string, string> = {}, date?: string) {
  const url = new URL("https://photos.crocparc.re/api/admin/overview")
  if (date) url.searchParams.set("date", date)
  const request = new Request(url.toString(), { headers: entetes })
  return (await overview({ request, env } as any)) as Response
}

const avecJeton = (date?: string) => demander({ Authorization: `Bearer ${JETON}` }, date)

function creerSession(code: string, date: string, photos: number, status = "active") {
  const id = `session-${code}-${date}`
  db.db
    .prepare(
      `INSERT INTO sessions (id, code, session_date, created_at, expires_at, photo_count, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(id, code, date, `${date}T08:00:00.000Z`, new Date(Date.now() + 30 * 86_400_000).toISOString(), photos, status)
  for (let index = 0; index < photos; index++) {
    db.db
      .prepare(
        `INSERT INTO photos (id, session_id, filename, shot_at, preview_key, thumb_key,
                             original_path, width, height, created_at)
         VALUES (?, ?, ?, ?, 'p', 't', 'o', 2048, 1365, ?)`,
      )
      .run(`${id}-photo-${index}`, id, `DSC${index}.JPG`, `${date}T10:0${index}:00+04:00`, `${date}T08:00:00.000Z`)
  }
  return id
}

describe("acces", () => {
  it("refuse sans jeton, avec un mauvais jeton, ou avec un schema inconnu", async () => {
    expect((await demander()).status).toBe(401)
    expect((await demander({ Authorization: "Bearer faux" })).status).toBe(401)
    expect((await demander({ Authorization: JETON })).status).toBe(401)
    expect((await demander({ Authorization: `Basic ${JETON}` })).status).toBe(401)
  })

  it("refuse tout le monde si le jeton n'est pas configure", async () => {
    env.ADMIN_TOKEN = ""
    expect((await demander({ Authorization: "Bearer " })).status).toBe(401)
    expect((await avecJeton()).status).toBe(401)
  })

  it("accepte le bon jeton", async () => {
    expect((await avecJeton()).status).toBe(200)
  })
})

describe("tableau de bord", () => {
  it("montre les visites du jour demande", async () => {
    creerSession("K7M2QP", "2026-10-15", 9)
    creerSession("Q4RT5Y", "2026-10-15", 4)
    creerSession("W8XZ3N", "2026-10-16", 7)

    const corps = (await (await avecJeton("2026-10-15")).json()) as any
    expect(corps.sessions).toHaveLength(2)
    expect(corps.totaux.sessions_du_jour).toBe(2)
    expect(corps.totaux.photos_du_jour).toBe(13)
  })

  it("remonte les photos sans carte, invisibles partout ailleurs", async () => {
    creerSession("ORPHAN", "2026-10-15", 5, "orphan")
    const corps = (await (await avecJeton("2026-10-15")).json()) as any
    expect(corps.orphelines).toHaveLength(1)
    expect(corps.orphelines[0].photo_count).toBe(5)
  })

  it("compte les ventes et les recettes", async () => {
    const session = creerSession("K7M2QP", "2026-10-15", 3)
    db.db
      .prepare(
        `INSERT INTO orders (id, session_id, product, photo_ids, amount_cents, status,
                             download_token, created_at, paid_at, email)
         VALUES ('c1', ?, 'pack', '[]', 2000, 'paid', 'jeton', '2026-10-15T12:00:00Z', '2026-10-15T12:01:00Z', 'famille@exemple.re')`,
      )
      .run(session)
    db.db
      .prepare(
        `INSERT INTO orders (id, session_id, product, photo_ids, amount_cents, status, created_at)
         VALUES ('c2', ?, 'single', '[]', 500, 'pending', '2026-10-15T13:00:00Z')`,
      )
      .run(session)

    const corps = (await (await avecJeton("2026-10-15")).json()) as any
    expect(corps.totaux.ventes_totales).toBe(1)
    expect(corps.totaux.recettes_centimes).toBe(2000)
    expect(corps.totaux.paniers_abandonnes).toBe(1)
    expect(corps.ventes).toHaveLength(2)
    // Les plus recentes d'abord : le panier abandonne de 13h precede la vente de 12h.
    expect(corps.ventes.map((v: any) => v.id)).toEqual(["c2", "c1"])
    expect(corps.ventes.find((v: any) => v.id === "c1").telechargeable).toBeTruthy()
    expect(corps.ventes.find((v: any) => v.id === "c2").telechargeable).toBeFalsy()
  })

  it("ne renvoie jamais de jeton de telechargement", async () => {
    const session = creerSession("K7M2QP", "2026-10-15", 1)
    db.db
      .prepare(
        `INSERT INTO orders (id, session_id, product, photo_ids, amount_cents, status,
                             download_token, created_at)
         VALUES ('c1', ?, 'pack', '[]', 2000, 'paid', 'jeton-tres-secret', '2026-10-15T12:00:00Z')`,
      )
      .run(session)
    const texte = await (await avecJeton("2026-10-15")).text()
    expect(texte).not.toContain("jeton-tres-secret")
  })

  it("une journee sans visite ne casse rien", async () => {
    const corps = (await (await avecJeton("2020-01-01")).json()) as any
    expect(corps.sessions).toEqual([])
    expect(corps.totaux.sessions_du_jour).toBe(0)
  })
})
