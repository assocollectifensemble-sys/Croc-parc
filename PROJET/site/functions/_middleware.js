/**
 * Protection par mot de passe — Croc Parc, presentation charte + logos.
 *
 * Le mot de passe vit dans la variable d'environnement MDP du projet Pages
 * (jamais dans le depot). Une fois saisi, un cookie signe evite de le
 * redemander pendant 30 jours.
 */

const COOKIE = "cp_acces";
const JOURS = 30;

async function signature(secret) {
  const data = new TextEncoder().encode("crocparc::" + secret);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Comparaison a temps constant : evite de fuiter le mot de passe au chrono. */
function egal(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function lireCookie(request, nom) {
  const brut = request.headers.get("Cookie") || "";
  for (const part of brut.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === nom) return v.join("=");
  }
  return null;
}

function pageConnexion(erreur) {
  const alerte = erreur
    ? `<p class="err">Mot de passe incorrect. Reessayez.</p>`
    : "";
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Croc Parc — acces reserve</title>
<link rel="icon" href="/img/favicon.ico">
<style>
  *{box-sizing:border-box}
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
       background:#0A0A0A;color:#F6F1E6;
       font-family:system-ui,-apple-system,"Segoe UI",sans-serif;padding:24px}
  .box{width:100%;max-width:380px;text-align:center}
  img{width:170px;height:auto;margin-bottom:26px}
  h1{font-size:20px;font-weight:500;margin:0 0 8px;letter-spacing:.01em}
  p.sub{font-size:14px;line-height:1.6;color:#9A958A;margin:0 0 28px}
  input{width:100%;padding:14px 16px;font-size:16px;background:#141414;
        border:1px solid rgba(246,241,230,.18);color:#F6F1E6;border-radius:2px;
        text-align:center;letter-spacing:.04em}
  input:focus{outline:none;border-color:#C9A227}
  button{width:100%;margin-top:12px;padding:14px;font-size:14px;font-weight:600;
         letter-spacing:.14em;text-transform:uppercase;background:#C9A227;color:#0A0A0A;
         border:0;border-radius:2px;cursor:pointer}
  button:hover{background:#dcb42c}
  .err{color:#E07A5F;font-size:13.5px;margin:16px 0 0}
  .pied{margin-top:30px;font-size:12px;color:#6b675f;line-height:1.6}
</style>
</head>
<body>
  <div class="box">
    <img src="/img/crocparc-logo-v3.png" alt="Croc Parc &amp; Cie">
    <h1>Acces reserve</h1>
    <p class="sub">Presentation de la charte graphique et des pistes de logo.</p>
    <form method="POST">
      <input type="password" name="mdp" placeholder="Mot de passe" autofocus
             autocomplete="current-password" required>
      <button type="submit">Entrer</button>
    </form>
    ${alerte}
    <p class="pied">Document de travail — Jonathan Bou</p>
  </div>
</body>
</html>`;
}

export async function onRequest(context) {
  const { request, env, next } = context;
  const attendu = env.MDP;

  // Pas de mot de passe configure : le site reste ouvert plutot que casse.
  if (!attendu) return next();

  const jeton = await signature(attendu);

  // Deja authentifie ?
  if (egal(lireCookie(request, COOKIE) || "", jeton)) return next();

  // Soumission du formulaire
  if (request.method === "POST") {
    const form = await request.formData();
    if (egal(String(form.get("mdp") || ""), attendu)) {
      return new Response(null, {
        status: 303,
        headers: {
          Location: new URL(request.url).pathname,
          "Set-Cookie":
            `${COOKIE}=${jeton}; Path=/; HttpOnly; Secure; SameSite=Lax; ` +
            `Max-Age=${JOURS * 24 * 3600}`,
        },
      });
    }
    return new Response(pageConnexion(true), {
      status: 401,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  // Le logo et la favicon de la page de connexion doivent rester accessibles.
  const chemin = new URL(request.url).pathname;
  if (chemin.startsWith("/img/favicon") || chemin === "/img/crocparc-logo-v3.png") {
    return next();
  }

  return new Response(pageConnexion(false), {
    status: 401,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
