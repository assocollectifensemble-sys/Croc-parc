/**
 * GET /api/gallery/:code
 *
 * Le test le plus important de ce fichier est celui qui verifie qu'un code
 * inexistant et un code expire donnent la meme reponse : c'est ce qui empeche
 * de deviner qu'une galerie existe.
 */

import { beforeEach, describe, expect, it } from "vitest"
import { onRequestGet } from "../api/gallery/[code]"
import { FakeD1 } from "./fake-d1"

const SECRET = "un-secret-partage-de-plus-de-32-caracteres"
const MIGRATIONS = ["0001_init.sql", "0002_rate_limits.sql"]

let db: FakeD1
let env: any

beforeEach(() => {
  db = new FakeD1()
  for (const migration of MIGRATIONS) {
    db.migrate(new URL(`../../db/migrations/${migration}`, import.meta.url).pathname)
  }
  env = {
    DB: db,
    BRIDGE_SHARED_SECRET: SECRET,
    PREVIEWS_BASE_URL: "https://previews.crocparc.re/",
  }
})

function creerSession(options: {
  code: string
  status?: string
  expiresAt?: string
  photos?: number
}) {
  const id = `session-${options.code}`
  const dans30Jours = new Date(Date.now() + 30 * 86_400_000).toISOString()
  db.db
    .prepare(
      `INSERT INTO sessions (id, code, session_date, created_at, expires_at, photo_count, status)
       VALUES (?, ?, '2026-10-15', ?, ?, ?, ?)`,
    )
    .run(
      id,
      options.code,
      new Date().toISOString(),
      options.expiresAt ?? dans30Jours,
      options.photos ?? 0,
      options.status ?? "active",
    )
  for (let index = 0; index < (options.photos ?? 0); index++) {
    db.db
      .prepare(
        `INSERT INTO photos (id, session_id, filename, shot_at, preview_key, thumb_key,
                             original_path, width, height, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 2048, 1365, ?)`,
      )
      .run(
        `photo-${options.code}-${index}`,
        id,
        `DSC0123${index}.JPG`,
        `2026-10-15T10:3${index}:00+04:00`,
        `2026-10-15/${options.code}/DSC0123${index}_p.jpg`,
        `2026-10-15/${options.code}/DSC0123${index}_t.jpg`,
        `2026-10-15/${options.code}/DSC0123${index}.JPG`,
        new Date().toISOString(),
      )
  }
  return id
}

async function demander(code: string, ip = "203.0.113.7") {
  const request = new Request(`https://photos.crocparc.re/api/gallery/${code}`, {
    headers: { "CF-Connecting-IP": ip },
  })
  return (await onRequestGet({ request, env, params: { code } } as any)) as Response
}

describe("galerie", () => {
  it("renvoie les photos d'une session active", async () => {
    creerSession({ code: "K7M2QP", photos: 3 })
    const reponse = await demander("K7M2QP")
    expect(reponse.status).toBe(200)

    const corps = (await reponse.json()) as any
    expect(corps.code).toBe("K7M2QP")
    expect(corps.photos).toHaveLength(3)
    expect(corps.photos[0].preview_url).toBe(
      "https://previews.crocparc.re/2026-10-15/K7M2QP/DSC01230_p.jpg",
    )
    expect(corps.pricing).toMatchObject({ single_cents: 500, pack_cents: 2000 })
  })

  it("accepte le code en minuscules", async () => {
    creerSession({ code: "K7M2QP", photos: 1 })
    expect((await demander("k7m2qp")).status).toBe(200)
  })

  it("ne divulgue jamais le chemin des originaux", async () => {
    creerSession({ code: "K7M2QP", photos: 2 })
    const texte = await (await demander("K7M2QP")).text()
    expect(texte).not.toContain("original")
    expect(texte).not.toContain(".JPG")
  })

  it("renvoie la meme reponse pour un code inconnu, expire, orphelin ou mal forme", async () => {
    creerSession({ code: "Q4RT5Y", photos: 1, expiresAt: "2020-01-01T00:00:00.000Z" })
    creerSession({ code: "ORPHAN", photos: 5, status: "orphan" })
    creerSession({ code: "W8XZ3N", photos: 1, status: "purged" })

    const reponses = await Promise.all([
      demander("K7M2QP", "198.51.100.1"), // n'existe pas
      demander("Q4RT5Y", "198.51.100.2"), // expiree
      demander("ORPHAN", "198.51.100.3"), // orpheline
      demander("W8XZ3N", "198.51.100.4"), // purgee
      demander("ABC", "198.51.100.5"), // mal forme
      demander("K7M2Q0", "198.51.100.6"), // hors alphabet
    ])

    for (const reponse of reponses) {
      expect(reponse.status).toBe(404)
      expect(await reponse.json()).toEqual({ error: "galerie introuvable" })
    }
  })

  it("une session sans photo reste consultable", async () => {
    creerSession({ code: "K7M2QP", photos: 0 })
    const corps = (await (await demander("K7M2QP")).json()) as any
    expect(corps.photos).toEqual([])
  })
})

describe("limitation de debit", () => {
  it("bloque l'enumeration au bout de 10 echecs", async () => {
    const ip = "192.0.2.50"
    for (let essai = 0; essai < 10; essai++) {
      expect((await demander("K7M2QP", ip)).status).toBe(404)
    }
    const bloque = await demander("Q4RT5Y", ip)
    expect(bloque.status).toBe(429)
    expect(Number(bloque.headers.get("Retry-After"))).toBeGreaterThan(0)
  })

  it("compte aussi les codes mal formes", async () => {
    const ip = "192.0.2.51"
    for (let essai = 0; essai < 10; essai++) await demander("ZZZ", ip)
    expect((await demander("ZZZ", ip)).status).toBe(429)
  })

  it("ne bloque pas une famille qui recharge sa galerie", async () => {
    creerSession({ code: "K7M2QP", photos: 2 })
    const ip = "192.0.2.52"
    for (let rechargement = 0; rechargement < 40; rechargement++) {
      expect((await demander("K7M2QP", ip)).status).toBe(200)
    }
  })

  it("isole les adresses les unes des autres", async () => {
    creerSession({ code: "K7M2QP", photos: 1 })
    for (let essai = 0; essai < 12; essai++) await demander("Q4RT5Y", "192.0.2.53")
    expect((await demander("K7M2QP", "192.0.2.54")).status).toBe(200)
  })

  it("ne stocke jamais l'adresse IP en clair", async () => {
    await demander("K7M2QP", "203.0.113.99")
    const lignes = db.db.prepare("SELECT bucket FROM rate_limits").all() as any[]
    expect(lignes.length).toBeGreaterThan(0)
    for (const ligne of lignes) expect(ligne.bucket).not.toContain("203.0.113")
  })
})

describe("carte reutilisee pendant la duree de vie d'une session", () => {
  /**
   * Le cas le plus grave du projet : les cartes sont physiques et repassent en
   * circulation. Tant que la premiere session n'a pas expire, deux visites du
   * meme code cohabitent. Servir « la plus recente » montrerait a la premiere
   * famille les photos d'enfants inconnus.
   */
  function deuxVisites() {
    creerSession({ code: "K7M2QP", photos: 2 })
    db.db
      .prepare("UPDATE sessions SET session_date = '2026-08-15' WHERE code = 'K7M2QP'")
      .run()
    const id = "session-septembre"
    db.db
      .prepare(
        `INSERT INTO sessions (id, code, session_date, created_at, expires_at, photo_count, status)
         VALUES (?, 'K7M2QP', '2026-09-01', ?, ?, 3, 'active')`,
      )
      .run(id, new Date().toISOString(), new Date(Date.now() + 30 * 86_400_000).toISOString())
    for (let index = 0; index < 3; index++) {
      db.db
        .prepare(
          `INSERT INTO photos (id, session_id, filename, shot_at, preview_key, thumb_key,
                               original_path, width, height, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, 2048, 1365, ?)`,
        )
        .run(
          `photo-sept-${index}`,
          id,
          `DSC0999${index}.JPG`,
          `2026-09-01T11:0${index}:00+04:00`,
          `2026-09-01/sept${index}_p.jpg`,
          `2026-09-01/sept${index}_t.jpg`,
          `2026-09-01/K7M2QP/DSC0999${index}.JPG`,
          new Date().toISOString(),
        )
    }
  }

  it("ne sert rien du tout, et ne revele meme pas les dates", async () => {
    // Le pont met normalement ces cartes en quarantaine, donc ce cas ne devrait
    // pas exister. S'il existe malgre tout, demander la date au visiteur ne
    // protegerait rien : quiconque tient la carte repondrait aussi bien pour la
    // visite d'une autre famille. On refuse.
    deuxVisites()
    const reponse = await demander("K7M2QP")
    expect(reponse.status).toBe(404)
    expect(await reponse.json()).toEqual({ error: "galerie introuvable" })
  })

  it("une date fournie ne debloque rien", async () => {
    deuxVisites()
    const request = new Request("https://photos.crocparc.re/api/gallery/K7M2QP?date=2026-09-01", {
      headers: { "CF-Connecting-IP": "203.0.113.7" },
    })
    const reponse = (await onRequestGet({
      request,
      env,
      params: { code: "K7M2QP" },
    } as any)) as Response
    expect(reponse.status).toBe(404)
    expect(await reponse.text()).not.toContain("preview")
  })
})

describe("appelant sans adresse identifiable", () => {
  it("refuse de servir plutot que de mettre tout le monde dans le meme seau", async () => {
    creerSession({ code: "K7M2QP", photos: 1 })
    const request = new Request("https://photos.crocparc.re/api/gallery/K7M2QP")
    const reponse = (await onRequestGet({ request, env, params: { code: "K7M2QP" } } as any)) as Response
    expect(reponse.status).toBe(503)
  })
})

describe("configuration", () => {
  it("echoue franchement si la base des previews n'est pas configuree", async () => {
    creerSession({ code: "K7M2QP", photos: 1 })
    env.PREVIEWS_BASE_URL = ""
    const reponse = await demander("K7M2QP")
    // Une galerie vide mais en apparence normale serait pire qu'une panne.
    expect(reponse.status).toBe(500)
  })
})
