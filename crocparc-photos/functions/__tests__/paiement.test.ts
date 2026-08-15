/**
 * Parcours de paiement : checkout, webhook Stripe, telechargement.
 *
 * Le point le plus important : le montant ne vient JAMAIS du client. Un
 * navigateur bricole peut envoyer ce qu'il veut, Stripe recevra toujours le
 * prix calcule ici a partir des photos reellement en base.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { onRequestPost as checkout } from "../api/checkout"
import { onRequestPost as webhook } from "../api/webhook/stripe"
import { onRequestGet as download } from "../api/download/[token]"
import { FakeD1 } from "./fake-d1"
import { FakeR2 } from "./fake-r2"

const SECRET_STRIPE = "sk_test_croc"
const SECRET_WEBHOOK = "whsec_croc"
const SECRET_PONT = "un-secret-partage-de-plus-de-32-caracteres"

let db: FakeD1
let r2: FakeR2
let env: any
let appelsStripe: { chemin: string; corps: string; idempotence: string | null }[]
let attendus: Map<string, string[]>

beforeEach(() => {
  db = new FakeD1()
  for (const migration of ["0001_init.sql", "0002_rate_limits.sql"]) {
    db.migrate(new URL(`../../db/migrations/${migration}`, import.meta.url).pathname)
  }
  r2 = new FakeR2()
  appelsStripe = []
  attendus = new Map()

  env = {
    DB: db,
    ORIGINALS: r2,
    BRIDGE_SHARED_SECRET: SECRET_PONT,
    BRIDGE_FETCH_URL: "https://pont.crocparc.re/fetch-original",
    STRIPE_SECRET_KEY: SECRET_STRIPE,
    STRIPE_WEBHOOK_SECRET: SECRET_WEBHOOK,
    PREVIEWS_BASE_URL: "https://previews.crocparc.re",
    PUBLIC_BASE_URL: "https://photos.crocparc.re",
  }

  vi.stubGlobal("fetch", async (url: any, options: any = {}) => {
    const adresse = String(url)
    if (adresse.startsWith("https://api.stripe.com")) {
      appelsStripe.push({
        chemin: adresse,
        corps: String(options.body ?? ""),
        idempotence: options.headers?.["Idempotency-Key"] ?? null,
      })
      return new Response(
        JSON.stringify({ id: "cs_test_123", url: "https://checkout.stripe.com/c/pay/cs_test_123" }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      )
    }
    if (adresse.includes("/fetch-original")) {
      const demande = JSON.parse(String(options.body))
      const reponse: Record<string, unknown> = {}
      for (const chemin of demande.paths) {
        r2.objets.set(`originals/${chemin}`, new TextEncoder().encode(`JPEG ${chemin}`))
        reponse[chemin] = { key: `originals/${chemin}`, bytes: 42 }
      }
      attendus.set("pont", demande.paths)
      return new Response(JSON.stringify({ originals: reponse }), { status: 200 })
    }
    if (adresse.includes("make.com")) {
      attendus.set("make", [String(options.body)])
      return new Response("ok", { status: 200 })
    }
    throw new Error(`appel reseau inattendu : ${adresse}`)
  })
})

afterEach(() => vi.unstubAllGlobals())

function creerVisite(code = "K7M2QP", nombre = 4, date = "2026-10-15") {
  const sessionId = `session-${code}-${date}`
  db.db
    .prepare(
      `INSERT INTO sessions (id, code, session_date, created_at, expires_at, photo_count, status)
       VALUES (?, ?, ?, ?, ?, ?, 'active')`,
    )
    .run(
      sessionId,
      code,
      date,
      new Date().toISOString(),
      new Date(Date.now() + 30 * 86_400_000).toISOString(),
      nombre,
    )
  const ids: string[] = []
  for (let index = 0; index < nombre; index++) {
    const id = `photo-${code}-${date}-${index}`
    ids.push(id)
    db.db
      .prepare(
        `INSERT INTO photos (id, session_id, filename, shot_at, preview_key, thumb_key,
                             original_path, width, height, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 2048, 1365, ?)`,
      )
      .run(
        id,
        sessionId,
        `DSC0123${index}.JPG`,
        `${date}T10:3${index}:00+04:00`,
        `${date}/opaque${index}_p.jpg`,
        `${date}/opaque${index}_t.jpg`,
        `${date}/${code}/DSC0123${index}.JPG`,
        new Date().toISOString(),
      )
  }
  return { sessionId, ids }
}

async function demanderPaiement(corps: unknown) {
  const request = new Request("https://photos.crocparc.re/api/checkout", {
    method: "POST",
    body: JSON.stringify(corps),
    headers: { "Content-Type": "application/json" },
  })
  return (await checkout({ request, env } as any)) as Response
}

function montantEnvoyeAStripe(): number {
  const corps = new URLSearchParams(appelsStripe[0].corps)
  return Number(corps.get("line_items[0][price_data][unit_amount]"))
}

/* --- checkout ------------------------------------------------------------- */
describe("checkout", () => {
  it("calcule le prix a l'unite cote serveur", async () => {
    const { ids } = creerVisite()
    const reponse = await demanderPaiement({
      code: "K7M2QP",
      product: "single",
      photo_ids: ids.slice(0, 2),
    })
    expect(reponse.status).toBe(200)
    expect(((await reponse.json()) as any).amount_cents).toBe(1000)
    expect(montantEnvoyeAStripe()).toBe(1000)
  })

  it("ignore un montant envoye par le client", async () => {
    const { ids } = creerVisite()
    await demanderPaiement({
      code: "K7M2QP",
      product: "single",
      photo_ids: ids.slice(0, 1),
      amount_cents: 1,
      amount: 1,
      price: 1,
    })
    expect(montantEnvoyeAStripe()).toBe(500)
  })

  it("le forfait couvre toutes les photos de la visite", async () => {
    creerVisite("K7M2QP", 12)
    const reponse = await demanderPaiement({ code: "K7M2QP", product: "pack", photo_ids: [] })
    expect(((await reponse.json()) as any).amount_cents).toBe(2000)
    const commande = db.db.prepare("SELECT photo_ids FROM orders").get() as any
    expect(JSON.parse(commande.photo_ids)).toHaveLength(12)
  })

  it("ecarte les photos qui n'appartiennent pas a la visite", async () => {
    const { ids } = creerVisite("K7M2QP", 3)
    creerVisite("Q4RT5Y", 3) // la visite d'une autre famille
    const reponse = await demanderPaiement({
      code: "K7M2QP",
      product: "single",
      photo_ids: [...ids, "photo-Q4RT5Y-2026-10-15-0", "photo-inventee"],
    })
    expect(((await reponse.json()) as any).amount_cents).toBe(1500) // 3 photos, pas 5
    const commande = db.db.prepare("SELECT photo_ids FROM orders").get() as any
    expect(JSON.parse(commande.photo_ids)).toEqual(ids)
  })

  it("enregistre la commande en attente", async () => {
    const { ids } = creerVisite()
    await demanderPaiement({ code: "K7M2QP", product: "single", photo_ids: [ids[0]] })
    const commande = db.db.prepare("SELECT * FROM orders").get() as any
    expect(commande.status).toBe("pending")
    expect(commande.stripe_session_id).toBe("cs_test_123")
    expect(commande.download_token).toBeNull()
  })

  it("protege du double clic par une cle d'idempotence", async () => {
    const { ids } = creerVisite()
    await demanderPaiement({ code: "K7M2QP", product: "single", photo_ids: [ids[0]] })
    expect(appelsStripe[0].idempotence).toBeTruthy()
  })

  it("refuse un produit inconnu, un code inconnu, une selection vide", async () => {
    const { ids } = creerVisite()
    expect((await demanderPaiement({ code: "K7M2QP", product: "gratuit", photo_ids: ids })).status).toBe(400)
    expect((await demanderPaiement({ code: "W8XZ3N", product: "single", photo_ids: ids })).status).toBe(404)
    expect((await demanderPaiement({ code: "K7M2QP", product: "single", photo_ids: [] })).status).toBe(400)
    expect((await demanderPaiement({ code: "ORPHAN", product: "pack", photo_ids: [] })).status).toBe(404)
    expect(db.db.prepare("SELECT COUNT(*) n FROM orders").get()).toEqual({ n: 0 })
  })

  it("refuse de choisir entre deux visites du meme code", async () => {
    creerVisite("K7M2QP", 3, "2026-10-15")
    creerVisite("K7M2QP", 3, "2026-11-02")
    expect((await demanderPaiement({ code: "K7M2QP", product: "pack" })).status).toBe(404)
    const avecDate = await demanderPaiement({
      code: "K7M2QP",
      product: "pack",
      session_date: "2026-10-15",
    })
    expect(avecDate.status).toBe(200)
  })
})

/* --- webhook -------------------------------------------------------------- */
async function signerStripe(corps: string, secret = SECRET_WEBHOOK, decalage = 0) {
  const horodatage = Math.floor(Date.now() / 1000) + decalage
  const cle = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  )
  const empreinte = await crypto.subtle.sign(
    "HMAC",
    cle,
    new TextEncoder().encode(`${horodatage}.${corps}`),
  )
  const hexa = [...new Uint8Array(empreinte)].map((o) => o.toString(16).padStart(2, "0")).join("")
  return `t=${horodatage},v1=${hexa}`
}

async function envoyerWebhook(evenement: unknown, options: { secret?: string; decalage?: number } = {}) {
  const corps = JSON.stringify(evenement)
  const signature = await signerStripe(corps, options.secret ?? SECRET_WEBHOOK, options.decalage ?? 0)
  const request = new Request("https://photos.crocparc.re/api/webhook/stripe", {
    method: "POST",
    body: corps,
    headers: { "Stripe-Signature": signature },
  })
  const attentes: Promise<unknown>[] = []
  const reponse = (await webhook({
    request,
    env,
    waitUntil: (promesse: Promise<unknown>) => attentes.push(promesse),
  } as any)) as Response
  await Promise.allSettled(attentes)
  return reponse
}

function evenementPaiement(commande: string) {
  return {
    id: "evt_1",
    type: "checkout.session.completed",
    data: {
      object: {
        id: "cs_test_123",
        client_reference_id: commande,
        customer_details: { email: "famille@exemple.re" },
      },
    },
  }
}

async function commandePayee() {
  const { ids } = creerVisite()
  await demanderPaiement({ code: "K7M2QP", product: "single", photo_ids: ids.slice(0, 2) })
  const commande = db.db.prepare("SELECT id FROM orders").get() as any
  await envoyerWebhook(evenementPaiement(commande.id))
  return db.db.prepare("SELECT * FROM orders WHERE id = ?").get(commande.id) as any
}

describe("webhook Stripe", () => {
  it("refuse une signature invalide et ne touche a rien", async () => {
    const { ids } = creerVisite()
    await demanderPaiement({ code: "K7M2QP", product: "single", photo_ids: [ids[0]] })
    const commande = db.db.prepare("SELECT id FROM orders").get() as any

    expect((await envoyerWebhook(evenementPaiement(commande.id), { secret: "whsec_faux" })).status).toBe(400)
    expect((await envoyerWebhook(evenementPaiement(commande.id), { decalage: -400 })).status).toBe(400)
    expect((db.db.prepare("SELECT status FROM orders").get() as any).status).toBe("pending")
  })

  it("passe la commande en paid et delivre un jeton", async () => {
    const commande = await commandePayee()
    expect(commande.status).toBe("paid")
    expect(commande.download_token).toMatch(/^[a-f0-9]{32}$/)
    expect(commande.email).toBe("famille@exemple.re")
    expect(commande.paid_at).toBeTruthy()
  })

  it("reclame les originaux au pont apres paiement", async () => {
    await commandePayee()
    expect(attendus.get("pont")).toEqual([
      "2026-10-15/K7M2QP/DSC01230.JPG",
      "2026-10-15/K7M2QP/DSC01231.JPG",
    ])
  })

  it("est idempotent : Stripe rejoue sans consequence", async () => {
    const premier = await commandePayee()
    const commande = db.db.prepare("SELECT id FROM orders").get() as any
    await envoyerWebhook(evenementPaiement(commande.id))
    await envoyerWebhook(evenementPaiement(commande.id))
    const apres = db.db.prepare("SELECT * FROM orders WHERE id = ?").get(commande.id) as any
    expect(apres.download_token).toBe(premier.download_token)
    expect(apres.paid_at).toBe(premier.paid_at)
    expect((db.db.prepare("SELECT COUNT(*) n FROM orders").get() as any).n).toBe(1)
  })

  it("acquitte les evenements qui ne le concernent pas", async () => {
    expect((await envoyerWebhook({ id: "evt_2", type: "payment_intent.created" })).status).toBe(200)
  })

  it("une panne du pont ne remet pas la commande en cause", async () => {
    vi.stubGlobal("fetch", async (url: any, options: any = {}) => {
      if (String(url).startsWith("https://api.stripe.com")) {
        return new Response(JSON.stringify({ id: "cs_test_999", url: "https://checkout" }), { status: 200 })
      }
      throw new Error("le pont est hors ligne")
    })
    const commande = await commandePayee()
    expect(commande.status).toBe("paid")
    expect(commande.download_token).toBeTruthy()
  })
})

/* --- telechargement ------------------------------------------------------- */
describe("telechargement", () => {
  async function demanderTelechargement(morceaux: string[]) {
    const request = new Request(`https://photos.crocparc.re/api/download/${morceaux.join("/")}`)
    return (await download({ request, env, params: { token: morceaux } } as any)) as Response
  }

  it("liste les photos achetees", async () => {
    const commande = await commandePayee()
    const reponse = await demanderTelechargement([commande.download_token])
    expect(reponse.status).toBe(200)
    const corps = (await reponse.json()) as any
    expect(corps.photos).toHaveLength(2)
    expect(corps.photos[0].filename).toBe("DSC01230.JPG")
  })

  it("sert le fichier avec son nom d'origine", async () => {
    const commande = await commandePayee()
    const liste = (await (await demanderTelechargement([commande.download_token])).json()) as any
    const reponse = await demanderTelechargement([commande.download_token, liste.photos[0].id])
    expect(reponse.status).toBe(200)
    expect(reponse.headers.get("Content-Disposition")).toContain("DSC01230.JPG")
    expect(await reponse.text()).toContain("JPEG")
  })

  it("refuse un jeton inconnu, malforme, ou une commande impayee", async () => {
    const { ids } = creerVisite()
    await demanderPaiement({ code: "K7M2QP", product: "single", photo_ids: [ids[0]] })
    expect((await demanderTelechargement(["a".repeat(32)])).status).toBe(404)
    expect((await demanderTelechargement(["pas-un-jeton"])).status).toBe(404)
    expect((await demanderTelechargement([""])).status).toBe(404)
  })

  it("ne sert pas une photo qui n'a pas ete achetee", async () => {
    const commande = await commandePayee()
    expect(
      (await demanderTelechargement([commande.download_token, "photo-K7M2QP-2026-10-15-3"])).status,
    ).toBe(404)
  })

  it("le lien meurt avec la galerie", async () => {
    const commande = await commandePayee()
    db.db.prepare("UPDATE sessions SET expires_at = '2020-01-01T00:00:00.000Z'").run()
    expect((await demanderTelechargement([commande.download_token])).status).toBe(404)
  })

  it("reclame l'original au pont s'il manque encore", async () => {
    const commande = await commandePayee()
    const liste = (await (await demanderTelechargement([commande.download_token])).json()) as any
    r2.objets.clear() // le pont etait hors ligne au moment du paiement

    const reponse = await demanderTelechargement([commande.download_token, liste.photos[0].id])
    expect(reponse.status).toBe(200)
    expect(r2.objets.size).toBeGreaterThan(0)
  })
})
