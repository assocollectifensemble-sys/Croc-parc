/**
 * GET /g/:code - sert la galerie en conservant l'URL du QR code.
 *
 * Une simple regle de reecriture ne suffit pas : Cloudflare Pages normalise
 * `/gallery.html` en `/gallery` par une redirection, et le code disparait de
 * l'URL au passage. On sert donc la page directement, l'adresse reste
 * `https://photos.crocparc.re/g/K7M2QP` -- lisible, partageable, et c'est elle
 * que le QR encode.
 */

import { CODE_PATTERN, type Env } from "../_lib/types"

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  const code = String(params.code ?? "").toUpperCase()

  // Un code mal forme ne merite pas la page de galerie : on renvoie le
  // visiteur vers la saisie plutot que de le laisser sur une erreur.
  if (!CODE_PATTERN.test(code)) {
    return Response.redirect(new URL("/", request.url).toString(), 302)
  }

  const url = new URL(request.url)
  url.pathname = "/gallery.html"
  const page = await env.ASSETS.fetch(new Request(url.toString(), { method: "GET" }))

  return new Response(page.body, {
    status: page.status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      // Une galerie contient des photos d'enfants : ni cache partage, ni
      // indexation, ni referent envoye vers l'exterieur.
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
    },
  })
}
