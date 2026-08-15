import { chromium, devices } from "@playwright/test"
const nav = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" })
const page = await (await nav.newContext({ ...devices["iPhone 13"], locale: "fr-FR" })).newPage()
const erreurs = []
page.on("pageerror", (e) => erreurs.push(e.message))
page.on("console", (m) => { if (m.type() === "error" && !m.text().includes("404")) erreurs.push(m.text()) })

await page.goto("http://localhost:8976/", { waitUntil: "networkidle" })
await page.locator("#code").fill("MNG5J7")
await page.locator("#valider").click()
await page.waitForSelector(".vignette img.chargee")
await page.waitForTimeout(700)
console.log("galerie :", (await page.locator("#entete").innerText()).replace(/\n/g, " | "))
console.log("vignettes :", await page.locator(".vignette").count())

await page.locator(".vignette").first().locator(".coche").click()
await page.waitForTimeout(300)
console.log("selection :", await page.locator("#resume-nombre").innerText(), "|", await page.locator("#resume-prix").innerText())

await page.locator("#tout-selectionner").click()
await page.waitForTimeout(300)
console.log("tout :", await page.locator("#resume-nombre").innerText(), "|", await page.locator("#resume-prix").innerText())

await page.locator(".vignette").first().locator(".ouvrir").click()
await page.waitForTimeout(500)
console.log("visionneuse :", await page.locator("#position").innerText())
await page.locator("#fermer").click()

// le paiement doit echouer proprement (pas de cle Stripe en local)
await page.locator("#acheter-tout").click()
await page.waitForTimeout(1500)
console.log("achat sans Stripe : la page tient debout, erreurs JS :", erreurs.length ? erreurs : "aucune")
await page.screenshot({ path: "/tmp/claude-0/-home-user-Croc-parc/3c381403-c984-53cb-add8-27d08342d583/scratchpad/shots/11-final.png" })
await nav.close()
