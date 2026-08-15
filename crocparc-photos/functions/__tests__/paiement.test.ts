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
import { onRequestGet as download } from "../api/download/[[token]]"
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
      // Le vrai Stripe renvoie la meme session pour une meme cle
      // d'idempotence : on l'imite, sinon le double clic n'est pas teste.
      const cle = options.headers?.["Idempotency-Key"] ?? String(appelsStripe.length)
      const identifiant = `cs_test_${cle}`
      return new Response(
        JSON.stringify({ id: identifiant, url: `https://checkout.stripe.com/c/pay/${identifiant}` }),
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

async function demanderPaiement(corps: unknown, ip = "203.0.113.7") {
  const request = new Request("https://photos.crocparc.re/api/checkout", {
    method: "POST",
    body: JSON.stringify(corps),
    headers: { "Content-Type": "application/json", "CF-Connecting-IP": ip },
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
    expect(commande.stripe_session_id).toMatch(/^cs_test_/)
    expect(commande.download_token).toBeNull()
  })

  it("un double clic ne cree qu'une seule commande", async () => {
    const { ids } = creerVisite()
    const panier = { code: "K7M2QP", product: "single", photo_ids: [ids[0]] }
    const premier = (await (await demanderPaiement(panier)).json()) as any
    const second = (await (await demanderPaiement(panier)).json()) as any

    expect(appelsStripe[0].idempotence).toBeTruthy()
    expect(appelsStripe[1].idempotence).toBe(appelsStripe[0].idempotence)
    expect(second.order_id).toBe(premier.order_id)
    expect((db.db.prepare("SELECT COUNT(*) n FROM orders").get() as any).n).toBe(1)
  })

  it("deux paniers differents restent deux commandes", async () => {
    const { ids } = creerVisite()
    await demanderPaiement({ code: "K7M2QP", product: "single", photo_ids: [ids[0]] })
    await demanderPaiement({ code: "K7M2QP", product: "single", photo_ids: [ids[1]] })
    expect((db.db.prepare("SELECT COUNT(*) n FROM orders").get() as any).n).toBe(2)
  })

  it("refuse un produit inconnu, un code inconnu, une selection vide", async () => {
    const { ids } = creerVisite()
    expect((await demanderPaiement({ code: "K7M2QP", product: "gratuit", photo_ids: ids })).status).toBe(400)
    expect((await demanderPaiement({ code: "W8XZ3N", product: "single", photo_ids: ids })).status).toBe(404)
    expect((await demanderPaiement({ code: "K7M2QP", product: "single", photo_ids: [] })).status).toBe(400)
    expect((await demanderPaiement({ code: "ORPHAN", product: "pack", photo_ids: [] })).status).toBe(404)
    expect(db.db.prepare("SELECT COUNT(*) n FROM orders").get()).toEqual({ n: 0 })
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

function evenementPaiement(commande: string, surcharge: Record<string, unknown> = {}) {
  const montant = (db.db.prepare("SELECT amount_cents FROM orders WHERE id = ?").get(commande) as any)
    ?.amount_cents
  return {
    id: "evt_1",
    type: "checkout.session.completed",
    data: {
      object: {
        id: "cs_test_123",
        client_reference_id: commande,
        payment_status: "paid",
        amount_total: montant,
        currency: "eur",
        customer_details: { email: "famille@exemple.re" },
        ...surcharge,
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
    const request = new Request(`https://photos.crocparc.re/api/download/${morceaux.join("/")}`, {
      headers: { "CF-Connecting-IP": "203.0.113.7" },
    })
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

/* --- ce que le webhook doit refuser --------------------------------------- */
describe("webhook : livraison seulement si l'argent est encaisse", () => {
  async function commandeEnAttente() {
    const { ids } = creerVisite()
    await demanderPaiement({ code: "K7M2QP", product: "single", photo_ids: ids.slice(0, 2) })
    return (db.db.prepare("SELECT id FROM orders").get() as any).id
  }

  it("ne livre pas un paiement differe encore impaye", async () => {
    // Prelevement, virement : Stripe emet `completed` avec payment_status
    // "unpaid", puis un second evenement quand l'argent arrive.
    const commande = await commandeEnAttente()
    const reponse = await envoyerWebhook(
      evenementPaiement(commande, { payment_status: "unpaid" }),
    )
    expect(reponse.status).toBe(200)
    const ligne = db.db.prepare("SELECT * FROM orders").get() as any
    expect(ligne.status).toBe("pending")
    expect(ligne.download_token).toBeNull()
  })

  it("livre au second evenement, quand le paiement differe aboutit", async () => {
    const commande = await commandeEnAttente()
    await envoyerWebhook(evenementPaiement(commande, { payment_status: "unpaid" }))
    const evenement = evenementPaiement(commande)
    evenement.type = "checkout.session.async_payment_succeeded"
    await envoyerWebhook(evenement)
    expect((db.db.prepare("SELECT status FROM orders").get() as any).status).toBe("paid")
  })

  it("refuse un montant qui ne correspond pas a la commande", async () => {
    const commande = await commandeEnAttente()
    await envoyerWebhook(evenementPaiement(commande, { amount_total: 1 }))
    expect((db.db.prepare("SELECT status FROM orders").get() as any).status).toBe("pending")
  })

  it("refuse une autre devise", async () => {
    const commande = await commandeEnAttente()
    await envoyerWebhook(evenementPaiement(commande, { currency: "usd" }))
    expect((db.db.prepare("SELECT status FROM orders").get() as any).status).toBe("pending")
  })
})

/* --- enumeration par /api/checkout ---------------------------------------- */
describe("checkout : pas d'oracle d'enumeration", () => {
  it("compte les echecs et finit par refuser", async () => {
    creerVisite("K7M2QP", 2)
    const ip = "192.0.2.77"
    const statuts: number[] = []
    for (let essai = 0; essai < 12; essai++) {
      const reponse = await demanderPaiement(
        { code: "W8XZ3N", product: "pack", photo_ids: [] },
        ip,
      )
      statuts.push(reponse.status)
    }
    expect(statuts.slice(0, 10)).toEqual(Array(10).fill(404))
    expect(statuts.slice(10)).toEqual([429, 429])
  })

  it("une selection vide sur un vrai code compte aussi comme un echec", async () => {
    creerVisite("K7M2QP", 2)
    const ip = "192.0.2.78"
    for (let essai = 0; essai < 10; essai++) {
      await demanderPaiement({ code: "K7M2QP", product: "single", photo_ids: [] }, ip)
    }
    const bloque = await demanderPaiement({ code: "K7M2QP", product: "single", photo_ids: [] }, ip)
    expect(bloque.status).toBe(429)
  })

  it("un achat legitime n'est jamais bloque", async () => {
    const { ids } = creerVisite("K7M2QP", 3)
    const ip = "192.0.2.79"
    for (let achat = 0; achat < 15; achat++) {
      const reponse = await demanderPaiement(
        { code: "K7M2QP", product: "single", photo_ids: [ids[achat % 3]] },
        ip,
      )
      expect(reponse.status).toBe(200)
    }
  })
})

/* --- tarif ---------------------------------------------------------------- */
describe("tarif du forfait", () => {
  it("ne facture jamais le forfait plus cher que les photos a l'unite", async () => {
    creerVisite("K7M2QP", 2) // deux photos : 10 euros a l'unite
    const reponse = await demanderPaiement({ code: "K7M2QP", product: "pack", photo_ids: [] })
    expect(((await reponse.json()) as any).amount_cents).toBe(1000)
    expect(montantEnvoyeAStripe()).toBe(1000)
  })

  it("applique le forfait des que la visite est fournie", async () => {
    creerVisite("K7M2QP", 9)
    const reponse = await demanderPaiement({ code: "K7M2QP", product: "pack", photo_ids: [] })
    expect(((await reponse.json()) as any).amount_cents).toBe(2000)
  })
})

/* --- le client recupere son lien ------------------------------------------ */
describe("recuperation du lien apres paiement", () => {
  async function demanderCommande(id: string, ip = "203.0.113.7") {
    const { onRequestGet } = await import("../api/order/[commande]")
    const request = new Request(`https://photos.crocparc.re/api/order/${id}`, {
      headers: { "CF-Connecting-IP": ip },
    })
    return (await onRequestGet({ request, env, params: { commande: id } } as any)) as Response
  }

  it("rend le jeton une fois la commande payee", async () => {
    const commande = await commandePayee()
    const reponse = await demanderCommande(commande.id)
    expect(reponse.status).toBe(200)
    expect(((await reponse.json()) as any).token).toBe(commande.download_token)
  })

  it("fait patienter tant que Stripe n'a pas confirme", async () => {
    const { ids } = creerVisite()
    await demanderPaiement({ code: "K7M2QP", product: "single", photo_ids: [ids[0]] })
    const id = (db.db.prepare("SELECT id FROM orders").get() as any).id

    const reponse = await demanderCommande(id)
    expect(reponse.status).toBe(202)
    const corps = (await reponse.json()) as any
    expect(corps.status).toBe("pending")
    expect(corps.token).toBeUndefined()
  })

  it("ne se laisse pas sonder", async () => {
    const inconnu = "11111111-2222-3333-4444-555555555555"
    const ip = "192.0.2.90"
    for (let essai = 0; essai < 10; essai++) {
      expect((await demanderCommande(inconnu, ip)).status).toBe(404)
    }
    expect((await demanderCommande(inconnu, ip)).status).toBe(429)
  })

  it("refuse un identifiant qui n'est pas un uuid", async () => {
    expect((await demanderCommande("../../etc/passwd")).status).toBe(404)
    expect((await demanderCommande("1")).status).toBe(404)
  })
})

/* --- ce que la galerie refuse, le paiement doit le refuser aussi ---------- */
describe("carte utilisee par deux visites : le checkout suit la galerie", () => {
  it("refuse l'achat, avec ou sans date", async () => {
    // Sans ce garde-fou, ce que la galerie refuse d'afficher pouvait tout de
    // meme etre achete puis telecharge en pleine resolution.
    creerVisite("K7M2QP", 3, "2026-10-15")
    creerVisite("K7M2QP", 4, "2026-11-02")

    expect((await demanderPaiement({ code: "K7M2QP", product: "pack" })).status).toBe(404)
    expect(
      (await demanderPaiement({ code: "K7M2QP", product: "pack", session_date: "2026-10-15" }))
        .status,
    ).toBe(404)
    expect((db.db.prepare("SELECT COUNT(*) n FROM orders").get() as any).n).toBe(0)
  })

  it("une date qui ne correspond pas a la seule visite est refusee", async () => {
    creerVisite("K7M2QP", 3, "2026-10-15")
    const reponse = await demanderPaiement({
      code: "K7M2QP",
      product: "pack",
      session_date: "2026-11-02",
    })
    expect(reponse.status).toBe(404)
  })
})

describe("doublons et idempotence", () => {
  it("ne facture pas trois fois la meme photo", async () => {
    const { ids } = creerVisite("K7M2QP", 3)
    const reponse = await demanderPaiement({
      code: "K7M2QP",
      product: "single",
      photo_ids: [ids[0], ids[0], ids[0]],
    })
    expect(((await reponse.json()) as any).amount_cents).toBe(500)
  })
})
