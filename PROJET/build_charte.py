import json, pathlib

A = json.load(open(pathlib.Path(__file__).parent / "assets" / "assets_b64.json"))
OUT = pathlib.Path(__file__).parent / "Charte-Croc-Parc-3-univers.html"
LOGO = A["logo"]

# ═══════════════════════════════════════════════════════════════════
#  CHROME DU DOCUMENT — volontairement NEUTRE
#  Gris/blanc, Archivo. Aucune des 3 chartes n'utilise ce vocabulaire,
#  pour qu'on ne confonde jamais le document avec une proposition.
# ═══════════════════════════════════════════════════════════════════

HEAD = """<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Croc Parc — Charte graphique &amp; logo</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800&family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Jost:wght@300;400;500;600&family=Alfa+Slab+One&family=Source+Serif+4:opsz,wght@8..60,400;8..60,600;8..60,700&family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,800&family=Outfit:wght@300;400;500;700;900&display=swap" rel="stylesheet">
<style>
:root{
  --doc:#FFFFFF; --doc2:#F5F5F4; --line:#DEDDD9; --line2:#EAE9E5;
  --ink:#16161A; --ink2:#55544F; --mut:#8A8880;
  --pad:clamp(22px,4.2vw,64px);
}
*{box-sizing:border-box}
html{scroll-behavior:smooth}
body{margin:0;background:var(--doc);color:var(--ink);
     font-family:Archivo,system-ui,sans-serif;-webkit-font-smoothing:antialiased}
img{max-width:100%;display:block}
.wrap{max-width:1180px;margin:0 auto;padding:0 var(--pad)}

/* ── nav ───────────────────────────────── */
nav{position:sticky;top:0;z-index:60;background:rgba(255,255,255,.94);
    backdrop-filter:blur(10px);border-bottom:1px solid var(--line)}
nav .in{max-width:1180px;margin:0 auto;padding:11px var(--pad);
        display:flex;gap:20px;flex-wrap:wrap;align-items:center;font-size:12.5px}
nav a{color:var(--mut);text-decoration:none;font-weight:500}
nav a:hover,nav a:focus{color:var(--ink)}
nav b{color:var(--ink);font-weight:700;letter-spacing:.02em;margin-right:6px}
nav .sp{flex:1}

/* ── typo doc ──────────────────────────── */
.kick{font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:var(--mut);font-weight:600}
h1{font-family:Archivo,sans-serif;font-weight:800;letter-spacing:-.035em;
   font-size:clamp(34px,6.4vw,64px);line-height:1.0;margin:.3em 0 .28em;max-width:16ch}
h2.doc{font-family:Archivo,sans-serif;font-weight:800;letter-spacing:-.03em;
       font-size:clamp(24px,3.8vw,38px);line-height:1.06;margin:0 0 6px}
h3.doc{font-family:Archivo,sans-serif;font-weight:700;letter-spacing:-.02em;
       font-size:clamp(19px,2.6vw,25px);margin:0 0 10px}
p.l{max-width:66ch;color:var(--ink2);font-size:16.5px;line-height:1.62;margin:0 0 13px}
p.l b{color:var(--ink);font-weight:700}
.sm{font-size:14.5px;color:var(--mut);line-height:1.6}

/* ── blocs repères ─────────────────────── */
.facts{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));
       gap:0;border-top:1px solid var(--line);border-bottom:1px solid var(--line);margin:34px 0}
.facts>div{padding:20px 22px 22px;border-right:1px solid var(--line2)}
.facts>div:last-child{border-right:0}
@media(max-width:760px){.facts>div{border-right:0;border-bottom:1px solid var(--line2)}}
.facts b{display:block;font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;
         color:var(--mut);margin-bottom:8px;font-weight:700}
.facts span{font-size:14.5px;line-height:1.55;color:var(--ink2);display:block}
.facts em{font-style:normal;color:var(--ink);font-weight:600}

/* ── logo actuel ───────────────────────── */
.cur{display:grid;grid-template-columns:210px 1fr;border:1px solid var(--line);margin:0 0 10px}
@media(max-width:760px){.cur{grid-template-columns:1fr}}
.cur .im{background:var(--doc2);display:flex;align-items:center;justify-content:center;padding:26px}
.cur .tx{padding:24px 28px;border-left:1px solid var(--line)}
@media(max-width:760px){.cur .tx{border-left:0;border-top:1px solid var(--line)}}

/* ── SÉPARATEUR D'UNIVERS — pleine page ── */
.cover{min-height:82vh;display:flex;flex-direction:column;justify-content:center;
       padding:var(--pad);margin-top:0;position:relative;overflow:hidden;
       page-break-before:always;break-before:page}
.cover .num{font-family:Archivo,sans-serif;font-weight:800;font-size:clamp(60px,13vw,150px);
            line-height:.82;letter-spacing:-.06em;opacity:.16}
.cover .nm{font-weight:800;letter-spacing:-.035em;font-size:clamp(34px,7vw,72px);
           line-height:1.0;margin:14px 0 0}
.cover .tl{font-size:11px;letter-spacing:.24em;text-transform:uppercase;font-weight:700;opacity:.7}
.cover .pitch{max-width:52ch;font-size:clamp(16px,2vw,20px);line-height:1.5;margin-top:20px;opacity:.9}
.cover .strip{display:flex;gap:0;margin-top:34px;max-width:520px;border:1px solid currentColor}
.cover .strip i{flex:1;height:44px;display:block}
.cover .ans{margin-top:26px;font-size:14.5px;line-height:1.6;max-width:50ch;
            padding-top:16px;border-top:1px solid currentColor;opacity:.85}
.cover .ans b{font-weight:700;opacity:1}

/* ── corps d'univers ───────────────────── */
.uni{padding-top:calc(var(--pad)*.9);scroll-margin-top:52px}
.uni-lead{display:grid;grid-template-columns:1fr 1fr;gap:0;
          border-top:1px solid var(--line);border-bottom:1px solid var(--line)}
@media(max-width:820px){.uni-lead{grid-template-columns:1fr}}
.uni-lead>div{padding:22px 26px}
.uni-lead>div+div{border-left:1px solid var(--line2)}
@media(max-width:820px){.uni-lead>div+div{border-left:0;border-top:1px solid var(--line2)}}
.uni-lead h4{margin:0 0 11px;font-size:10.5px;letter-spacing:.16em;text-transform:uppercase;
             color:var(--mut);font-weight:700}
.uni-lead ul{margin:0;padding-left:0;list-style:none}
.uni-lead li{font-size:15px;line-height:1.5;color:var(--ink2);
             padding-left:16px;position:relative;margin-bottom:9px}
.uni-lead li:before{content:"";position:absolute;left:0;top:8px;width:6px;height:1.5px;background:var(--mut)}
.uni-lead li b{color:var(--ink);font-weight:700}

/* système : palette + typo */
.sysbar{display:grid;grid-template-columns:1.25fr 1fr;gap:0;border-bottom:1px solid var(--line)}
@media(max-width:820px){.sysbar{grid-template-columns:1fr}}
.sysbar>div{padding:22px 26px}
.sysbar>div+div{border-left:1px solid var(--line2)}
@media(max-width:820px){.sysbar>div+div{border-left:0;border-top:1px solid var(--line2)}}
.sysbar h4{margin:0 0 13px;font-size:10.5px;letter-spacing:.16em;text-transform:uppercase;
           color:var(--mut);font-weight:700}
.sw{display:flex;flex-wrap:wrap;gap:8px}
.sw div{width:76px}
.sw i{display:block;height:54px;border:1px solid rgba(0,0,0,.10)}
.sw small{display:block;margin-top:6px;font-size:10px;color:var(--mut);font-weight:600}
.sw code{display:block;font-size:9px;color:#B5B3AC;font-family:ui-monospace,monospace}
.tp b{display:block;font-size:22px;line-height:1.15;color:var(--ink)}
.tp span{color:var(--mut);font-size:12.5px;line-height:1.5;display:block;margin-top:4px}
.tp>div+div{margin-top:14px}

/* applications */
.apps{display:grid;grid-template-columns:repeat(12,1fr);gap:1px;background:var(--line)}
.apps>*{background:#000;min-height:150px;position:relative;overflow:hidden}
.c12{grid-column:span 12}.c8{grid-column:span 8}.c7{grid-column:span 7}
.c6{grid-column:span 6}.c5{grid-column:span 5}.c4{grid-column:span 4}
@media(max-width:820px){.c8,.c7,.c6,.c5,.c4{grid-column:span 12}}
.tag{position:absolute;top:10px;left:12px;z-index:6;font-size:9px;letter-spacing:.14em;
     text-transform:uppercase;padding:4px 9px;background:rgba(0,0,0,.58);color:#fff;
     font-family:Archivo,sans-serif;font-weight:600}
.ph{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.vg{position:absolute;inset:0}
.pad{position:relative;z-index:4;padding:clamp(20px,3vw,34px);height:100%;
     display:flex;flex-direction:column;justify-content:flex-end;gap:8px}
.padc{position:relative;z-index:4;padding:clamp(20px,3vw,34px);height:100%;
      display:flex;flex-direction:column;justify-content:center;align-items:center;
      text-align:center;gap:10px}
.plan{position:absolute;inset:0;z-index:3}
.plan svg{width:100%;height:100%;display:block}

/* verdict */
.verdict{display:grid;grid-template-columns:1fr 1fr;gap:0;border-bottom:1px solid var(--line)}
@media(max-width:760px){.verdict{grid-template-columns:1fr}}
.verdict>div{padding:20px 26px}
.verdict>div+div{border-left:1px solid var(--line2)}
@media(max-width:760px){.verdict>div+div{border-left:0;border-top:1px solid var(--line2)}}
.verdict b.h{display:block;font-size:10.5px;letter-spacing:.16em;text-transform:uppercase;
             margin-bottom:10px;font-weight:700}
.verdict ul{margin:0;padding-left:17px}
.verdict li{margin-bottom:7px;font-size:14.5px;line-height:1.5;color:var(--ink2)}
.verdict li b{color:var(--ink);font-weight:700}

/* logos */
.logos{display:grid;grid-template-columns:repeat(auto-fit,minmax(330px,1fr));
       gap:1px;background:var(--line);border:1px solid var(--line);margin-top:26px}
.lg{background:#fff;display:flex;flex-direction:column}
.lg .stage{background:var(--doc2);padding:34px 26px;display:flex;align-items:center;
           justify-content:center;min-height:190px}
.lg .mini{display:flex;gap:0;border-top:1px solid var(--line2)}
.lg .mini div{flex:1;padding:14px;display:flex;align-items:center;justify-content:center;min-height:74px}
.lg .mini div+div{border-left:1px solid var(--line2)}
.lg .tx{padding:18px 22px 22px;border-top:1px solid var(--line2)}
.lg .tx .n{font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:var(--mut);font-weight:700}
.lg .tx h5{margin:5px 0 8px;font-size:19px;font-weight:800;letter-spacing:-.02em}
.lg .tx p{margin:0;font-size:14px;line-height:1.55;color:var(--ink2)}
.lg .tx .meta{margin-top:11px;padding-top:10px;border-top:1px solid var(--line2);
              font-size:12.5px;color:var(--mut);line-height:1.5}
.lg .tx .meta b{color:var(--ink2);font-weight:600}

/* tableau */
table{width:100%;border-collapse:collapse;margin-top:20px;font-size:14.5px}
th,td{text-align:left;padding:12px 13px;border-bottom:1px solid var(--line2);vertical-align:top}
th{font-size:10.5px;letter-spacing:.13em;text-transform:uppercase;color:var(--mut);font-weight:700;
   border-bottom:1px solid var(--line)}
td:first-child{color:var(--mut);width:200px;font-weight:500}
td b{font-weight:700}

/* blocs "à retenir" */
.note{border-left:3px solid var(--ink);padding:2px 0 2px 18px;margin:22px 0;max-width:68ch}
.note p{margin:0 0 8px;font-size:15.5px;line-height:1.6;color:var(--ink2)}
.note p:last-child{margin-bottom:0}
.note b{color:var(--ink);font-weight:700}

section.blk{padding-top:calc(var(--pad)*.85);padding-bottom:6px}
.pagebreak{page-break-before:always;break-before:page}
footer{border-top:1px solid var(--line);margin-top:calc(var(--pad)*.9);
       padding:30px 0 60px;color:var(--ink2);font-size:15.5px;line-height:1.7}
footer b{color:var(--ink);font-weight:700}

@media print{
  nav{display:none}
  .cover{min-height:auto;padding:60px 40px}
  body{-webkit-print-color-adjust:exact;print-color-adjust:exact}
}
</style>
</head>
<body>

<nav><div class="in">
  <b>Croc&nbsp;Parc</b>
  <a href="#u1">01 Noir Premium</a>
  <a href="#u2">02 Lontan</a>
  <a href="#u3">03 Grand Air</a>
  <a href="#logos">Logos</a>
  <a href="#choix">Comparer</a>
  <span class="sp"></span>
  <a href="#choix" style="color:var(--ink)">Vos retours →</a>
</div></nav>

<div class="wrap">
<header style="padding-top:calc(var(--pad)*.9)">
  <div class="kick">Croc Parc · Étang-Salé — document de travail</div>
  <h1>Charte graphique &amp; logo</h1>
  <p class="l" style="font-size:18px"><b>Trois univers très différents.</b> Puis <b>six pistes de logo.</b>
  Rien n'est définitif : ce document sert à faire apparaître ce qui vous plaît et ce que vous rejetez.</p>

  <div class="facts">
    <div><b>Ce qu'on vous demande</b><span><em>Choisir un univers.</em> Puis dire quelle piste de logo vous parle. C'est tout.</span></div>
    <div><b>Ce que ça débloque</b><span>Signalétique des <em>2 entrées + scène</em>, affiche d'octobre, carte du parc, documents groupes.</span></div>
    <div><b>Le garde-fou</b><span>Ne pas dénaturer le parc : <em>nature, jeunesse, plein air, vivre-ensemble.</em></span></div>
    <div><b>Le test appliqué</b><span>Tenir sur un <em>panneau à 3 m</em>, sur un <em>post Instagram</em>, et sur un <em>dossier de privatisation</em>.</span></div>
  </div>

  <h3 class="doc">Le logo actuel</h3>
  <div class="cur">
    <div class="im"><img src="__LOGO__" alt="Logo Croc Parc actuel" style="max-height:150px;width:auto"></div>
    <div class="tx">
      <p class="l" style="margin-bottom:10px">Crocodile illustré, palmier, anneau « Nature · Loisirs », baseline « Parc animalier ».
      <b>Chaleureux, reconnu localement — mais daté, et très chargé.</b></p>
      <p class="sm" style="margin:0">Dans les <b style="color:var(--ink)">trois univers ci-dessous, il est conservé tel quel</b> :
      vous jugez la charte, pas le logo. Les pistes d'évolution du logo arrivent en <a href="#logos" style="color:var(--ink)">seconde partie</a>.</p>
    </div>
  </div>

  <div class="note">
    <p><b>Comment lire ce document.</b> Chaque univers commence par une page pleine qui donne le ton.
    Les textes des maquettes sont les <b>vrais textes de votre site</b> — tarifs, horaires, noms d'animaux,
    Croc'Snack, Maï-Taï. Rien n'est inventé.</p>
  </div>
</header>
</div>
"""


# ═══════════════════════════════════════════════════════════════════
#  PLAN DU PARC — silhouettes de zones, aucun rond, aucune bulle
# ═══════════════════════════════════════════════════════════════════
def plan(bg, zone, stroke, ink, accent, label_font, water):
    return f"""<svg viewBox="0 0 620 300" preserveAspectRatio="xMidYMid slice" aria-label="Plan du parc">
  <rect width="620" height="300" fill="{bg}"/>
  <g fill="{zone}" stroke="{stroke}" stroke-width="1.2">
    <path d="M28 46 L212 40 L228 116 L196 172 L44 166 Z"/>
    <path d="M232 40 L410 44 L420 120 L236 118 Z"/>
    <path d="M430 46 L594 52 L588 150 L424 142 Z"/>
    <path d="M46 182 L200 188 L214 262 L52 256 Z"/>
    <path d="M232 134 L418 138 L410 262 L222 258 Z"/>
    <path d="M436 162 L590 168 L584 260 L430 254 Z"/>
  </g>
  <path d="M222 30 L222 272 M424 30 L424 272" stroke="{stroke}" stroke-width="1.2" fill="none"/>
  <path d="M24 176 L600 182" stroke="{stroke}" stroke-width="1.2" fill="none"/>
  <path d="M258 150 C296 146 330 158 366 152 C396 147 410 152 412 158 C404 172 372 176 340 172 C300 167 268 172 258 164 Z" fill="{water}" stroke="none"/>
  <path d="M448 176 L576 180 L570 250 L444 246 Z" fill="none" stroke="{accent}" stroke-width="2.2" stroke-dasharray="7 5"/>
  <g fill="{ink}" font-family="{label_font}" font-size="11.5" letter-spacing="1.6">
    <text x="44" y="72">CROCODILES DU NIL</text>
    <text x="248" y="72">MINI-FERME</text>
    <text x="446" y="80">JARDIN BOTANIQUE</text>
    <text x="62" y="214">MINI-GOLF</text>
    <text x="248" y="176">LES BASSINS</text>
    <text x="452" y="204" fill="{accent}">LA SCÈNE</text>
  </g>
  <g fill="{accent}">
    <path d="M20 168 L34 161 L34 175 Z"/>
    <path d="M604 190 L590 183 L590 197 Z"/>
  </g>
  <g fill="{ink}" font-family="{label_font}" font-size="9" letter-spacing="2.4" opacity=".72">
    <text x="40" y="290">ENTRÉE PRINCIPALE</text>
    <text x="500" y="290">ENTRÉE 2</text>
  </g>
</svg>"""


# ═══════════════════════════════════════════════════════════════════
#  GABARITS
# ═══════════════════════════════════════════════════════════════════
def cover(num, nom, bg, ink, pitch, bandes, reponse, tl):
    strip = "".join(f'<i style="background:{c}"></i>' for c in bandes)
    return f"""
<section class="cover" id="{tl}" style="background:{bg};color:{ink}">
  <div class="wrap" style="padding-left:0;padding-right:0">
    <div class="tl">Univers {num}</div>
    {'<div class="num">' + num + '</div>' if num == "01" else ''}
    <div class="nm"{' style="margin-top:18px"' if num != "01" else ''}>{nom}</div>
    <div class="pitch">{pitch}</div>
    <div class="strip" style="border-color:{ink}33">{strip}</div>
    <div class="ans" style="border-color:{ink}33">{reponse}</div>
  </div>
</section>"""


def univers(uid, pour_qui, pas_pour, palette, typo, apps, plus, moins):
    sw = "".join(
        f'<div><i style="background:{c}"></i><small>{nm}</small><code>{c}</code></div>'
        for c, nm in palette
    )
    tp = "".join(
        f'<div style="font-family:{f}"><b>{nm}</b><span>{ro}</span></div>' for nm, f, ro in typo
    )
    lp = "".join(f"<li>{x}</li>" for x in pour_qui)
    ln = "".join(f"<li>{x}</li>" for x in pas_pour)
    vp = "".join(f"<li>{x}</li>" for x in plus)
    vm = "".join(f"<li>{x}</li>" for x in moins)
    return f"""
<div class="wrap"><div class="uni">
  <div class="uni-lead">
    <div><h4>Ce que cet univers fait bien</h4><ul>{lp}</ul></div>
    <div><h4>Ce qu'il fait moins bien</h4><ul>{ln}</ul></div>
  </div>
  <div class="sysbar">
    <div><h4>Palette</h4><div class="sw">{sw}</div></div>
    <div><h4>Typographie</h4><div class="tp">{tp}</div></div>
  </div>
  <div class="apps">{apps}</div>
  <div class="verdict">
    <div><b class="h">Pour</b><ul>{vp}</ul></div>
    <div><b class="h">Contre</b><ul>{vm}</ul></div>
  </div>
</div></div>"""


# ═══════════════════════════════════════════════════════════════════
#  UNIVERS 01 — NOIR PREMIUM & OR
# ═══════════════════════════════════════════════════════════════════
u1_apps = f"""
<div class="c7" style="background:#0A0A0A">
  <span class="tag">Panneau d'orientation · entrée</span>
  <img class="ph" src="{A['croco']}" alt="" style="opacity:.30;filter:grayscale(.5) contrast(1.1)">
  <div class="vg" style="background:linear-gradient(90deg,#0A0A0A 30%,rgba(10,10,10,.55))"></div>
  <div class="pad" style="min-height:300px">
    <div style="width:92px;height:92px;border-radius:50%;background:#F6F1E6;display:flex;align-items:center;justify-content:center;margin-bottom:14px;border:1px solid #C9A227">
      <img src="{LOGO}" alt="" style="width:74px">
    </div>
    <div style="font-family:'Cormorant Garamond',serif;font-size:clamp(28px,3.8vw,44px);color:#F6F1E6;font-weight:600;line-height:1.06">Bienvenue</div>
    <div style="height:1px;background:#C9A227;width:64px;margin:8px 0 10px"></div>
    <div style="font-family:Jost,sans-serif;font-weight:500;font-size:13px;letter-spacing:.26em;color:#C9A227;text-transform:uppercase">Le parc animalier &nbsp;·&nbsp; Le mini-golf &nbsp;·&nbsp; Maï-Taï</div>
  </div>
</div>

<div class="c5" style="background:#F6F1E6">
  <span class="tag" style="background:rgba(255,255,255,.75);color:#111">Dossier privatisation</span>
  <div class="pad" style="min-height:300px;justify-content:space-between">
    <div style="padding-top:22px">
      <img src="{LOGO}" alt="" style="width:56px;margin-bottom:16px">
      <div style="font-family:Jost,sans-serif;font-size:10px;letter-spacing:.3em;color:#8C7A3F;text-transform:uppercase">Vos évènements</div>
    </div>
    <div>
      <div style="font-family:'Cormorant Garamond',serif;font-size:clamp(24px,3.2vw,36px);color:#111;font-weight:500;line-height:1.12">Recevoir<br><em>en plein air</em></div>
      <div style="height:1px;background:#C9A227;width:52px;margin:14px 0 12px"></div>
      <div style="font-family:Jost,sans-serif;font-size:12.5px;color:#5B564D;line-height:1.65">4,7 hectares dans la forêt protégée<br>de l'Étang-Salé · scène équipée<br>parking privatif</div>
    </div>
  </div>
</div>

<div class="c8" style="background:#0A0A0A">
  <span class="tag">Plan du parc · signalétique</span>
  <div class="plan">{plan("#0A0A0A", "#17171A", "#3A382F", "#F6F1E6", "#C9A227", "Jost, sans-serif", "#20303A")}</div>
</div>

<div class="c4" style="background:#141414">
  <span class="tag">Tarifs · ce qui est inclus</span>
  <div class="pad" style="min-height:300px;justify-content:center;gap:9px">
    <div style="font-family:Jost,sans-serif;font-weight:500;font-size:10px;letter-spacing:.28em;color:#C9A227;text-transform:uppercase">Tarif unique · 15 €</div>
    <div style="font-family:'Cormorant Garamond',serif;font-size:29px;color:#F6F1E6;font-weight:500;line-height:1.1">La journée entière</div>
    <div style="height:1px;background:#3A3A38;width:100%;margin:3px 0"></div>
    <div style="font-family:Jost,sans-serif;font-size:13px;color:#C4BFB6;line-height:1.95">
      Crocodiles du Nil, makis, paons<br>
      Jardin botanique &amp; plantes remarquables<br>
      Mini-golf, gonflables, aire de jeux<br>
      Croc'Snack &amp; Maï-Taï Restaurant</div>
    <div style="font-family:Jost,sans-serif;font-size:11.5px;color:#8C7A3F;margin-top:3px">Gratuit pour les moins de 3 ans · Scolaires 5 €</div>
  </div>
</div>

<div class="c4" style="background:#0A0A0A">
  <span class="tag">Affiche vacances d'octobre</span>
  <img class="ph" src="{A['maki']}" alt="" style="opacity:.42;filter:grayscale(.35)">
  <div class="vg" style="background:linear-gradient(0deg,#0A0A0A 12%,rgba(10,10,10,.35))"></div>
  <div class="padc" style="min-height:300px;justify-content:flex-end">
    <div style="font-family:Jost,sans-serif;font-weight:500;font-size:11px;letter-spacing:.3em;color:#C9A227;text-transform:uppercase">10 → 26 octobre · 7j/7</div>
    <div style="font-family:'Cormorant Garamond',serif;font-size:clamp(24px,3vw,34px);color:#F6F1E6;font-weight:500;line-height:1.12">Vos vacances<br><em>à Croc Parc</em></div>
    <div style="border:1px solid #C9A227;color:#C9A227;font-family:Jost,sans-serif;font-weight:500;font-size:11px;letter-spacing:.2em;padding:8px 18px;text-transform:uppercase;margin-top:6px">Le programme</div>
  </div>
</div>

<div class="c4" style="background:#141414">
  <span class="tag">Billet · scan à l'entrée</span>
  <div class="padc" style="min-height:300px">
    <img src="{LOGO}" alt="" style="width:50px;opacity:.95">
    <div style="font-family:'Cormorant Garamond',serif;font-size:25px;color:#F6F1E6;font-weight:500">Entrée · 15 €</div>
    <div style="width:100%;max-width:190px;height:44px;background:repeating-linear-gradient(90deg,#F6F1E6 0 2px,transparent 2px 5px);margin:6px 0"></div>
    <div style="font-family:Jost,sans-serif;font-weight:500;font-size:11px;letter-spacing:.2em;color:#C9A227;text-transform:uppercase">Mardi → dimanche · 10h-17h</div>
  </div>
</div>

<div class="c4" style="background:#0A0A0A">
  <span class="tag">Post Instagram</span>
  <img class="ph" src="{A['paon']}" alt="" style="opacity:.85">
  <div class="vg" style="background:linear-gradient(0deg,rgba(10,10,10,.92) 8%,transparent 62%)"></div>
  <div class="pad" style="min-height:300px">
    <div style="font-family:'Cormorant Garamond',serif;font-size:24px;color:#F6F1E6;font-weight:500;line-height:1.15">Le paon bleu<br><em>fait la roue</em></div>
    <div style="font-family:Jost,sans-serif;font-weight:500;font-size:10px;letter-spacing:.22em;color:#C9A227;text-transform:uppercase;margin-top:6px">Croc Parc · Forêt de l'Étang-Salé</div>
  </div>
</div>
"""

# ═══════════════════════════════════════════════════════════════════
#  UNIVERS 02 — LONTAN
# ═══════════════════════════════════════════════════════════════════
u2_apps = f"""
<div class="c6" style="background:#F4E9D7">
  <span class="tag" style="background:rgba(255,255,255,.78);color:#111">Panneau d'orientation</span>
  <div style="position:absolute;top:0;left:0;right:0;height:26px;background:repeating-linear-gradient(90deg,#B23A2E 0 14px,transparent 14px 28px);-webkit-mask:radial-gradient(circle at 14px 0,transparent 11px,#000 12px) 0 0/28px 26px;mask:radial-gradient(circle at 14px 0,transparent 11px,#000 12px) 0 0/28px 26px"></div>
  <div class="pad" style="min-height:300px;justify-content:space-between;padding-top:52px">
    <img src="{LOGO}" alt="" style="width:80px">
    <div>
      <div style="font-family:'Alfa Slab One',serif;font-size:clamp(24px,3.4vw,38px);color:#1F3D2B;line-height:1.05">Ou lé la !</div>
      <div style="font-family:'Source Serif 4',serif;font-size:14.5px;color:#6B5B45;margin-top:8px;line-height:1.55">Les crocodiles à gauche, le mini-golf<br>tout droit, le Maï-Taï sur la place.</div>
    </div>
  </div>
</div>

<div class="c6" style="background:#1F3D2B">
  <span class="tag">Affiche vacances d'octobre</span>
  <img class="ph" src="{A['golf']}" alt="" style="opacity:.34;filter:sepia(.35) saturate(1.15)">
  <div class="vg" style="background:linear-gradient(180deg,rgba(31,61,43,.55),rgba(31,61,43,.94))"></div>
  <div class="padc" style="min-height:300px">
    <div style="font-family:'Source Serif 4',serif;font-style:italic;font-size:15.5px;color:#F4C860">du 10 au 26 octobre · ouvert 7j/7</div>
    <div style="font-family:'Alfa Slab One',serif;font-size:clamp(26px,4vw,42px);color:#F4E9D7;line-height:1.02;text-transform:uppercase">Vacances<br>lontan</div>
    <div style="font-family:'Source Serif 4',serif;font-size:14.5px;color:#DFD2BA;max-width:32ch;line-height:1.55">Chasse au trésor, nourrissage des crocodiles, brossage des cabris, mini-golf.</div>
    <div style="background:#E8B33C;color:#1F3D2B;font-family:'Alfa Slab One',serif;font-size:13px;padding:11px 24px;margin-top:6px">TOUT LE PROGRAMME</div>
  </div>
</div>

<div class="c8" style="background:#F4E9D7">
  <span class="tag" style="background:rgba(255,255,255,.78);color:#111">Plan du parc · signalétique</span>
  <div class="plan">{plan("#F4E9D7", "#E5D6BC", "#B9A484", "#1F3D2B", "#B23A2E", "'Source Serif 4', serif", "#9EC4C0")}</div>
</div>

<div class="c4" style="background:#B23A2E">
  <span class="tag">Offre Gramoun · bal la poussière</span>
  <div class="padc" style="min-height:300px">
    <div style="font-family:'Source Serif 4',serif;font-style:italic;font-size:16px;color:#FFF4E2">un mardi par mois</div>
    <div style="font-family:'Alfa Slab One',serif;font-size:clamp(24px,3.2vw,34px);color:#FFF7EA;line-height:1.05;text-transform:uppercase">Bal la<br>poussière</div>
    <div style="width:52px;height:3px;background:#F4C860"></div>
    <div style="font-family:'Source Serif 4',serif;font-weight:600;font-size:15px;color:#FFF7EA;max-width:26ch;line-height:1.55">Orchestre live, la scène, le Maï-Taï. Pour nos aînés.</div>
  </div>
</div>

<div class="c4" style="background:#F4E9D7">
  <span class="tag" style="background:rgba(255,255,255,.78);color:#111">Anniversaires</span>
  <img class="ph" src="{A['visite']}" alt="" style="opacity:.9">
  <div class="vg" style="background:linear-gradient(0deg,rgba(244,233,215,.97) 26%,rgba(244,233,215,.15))"></div>
  <div class="pad" style="min-height:290px">
    <div style="font-family:'Alfa Slab One',serif;font-size:25px;color:#1F3D2B;line-height:1.06;text-transform:uppercase">Fête ton<br>anniversaire</div>
    <div style="font-family:'Source Serif 4',serif;font-size:14px;color:#6B5B45;margin-top:6px;line-height:1.5">Chasse au trésor, nourrissage,<br>gâteau. On s'occupe de tout.</div>
  </div>
</div>

<div class="c4" style="background:#1F3D2B">
  <span class="tag">Ateliers scolaires</span>
  <div class="pad" style="min-height:290px;justify-content:center;gap:10px">
    <div style="font-family:'Source Serif 4',serif;font-style:italic;font-size:15px;color:#F4C860">5 € par élève</div>
    <div style="font-family:'Alfa Slab One',serif;font-size:26px;color:#F4E9D7;line-height:1.06;text-transform:uppercase">Ateliers<br>scolaires</div>
    <div style="width:46px;height:3px;background:#B23A2E"></div>
    <div style="font-family:'Source Serif 4',serif;font-size:14.5px;color:#DFD2BA;line-height:1.6">Ludiques et interactifs — s'amuser tout en apprenant, au cœur de la forêt protégée.</div>
  </div>
</div>

<div class="c4" style="background:#F4E9D7">
  <span class="tag" style="background:rgba(255,255,255,.78);color:#111">Tenue équipe · dos de polo</span>
  <div class="padc" style="min-height:290px">
    <div style="background:#1F3D2B;padding:18px 24px 14px;position:relative">
      <img src="{LOGO}" alt="" style="width:88px;filter:brightness(1.06)">
      <div style="position:absolute;left:0;right:0;bottom:-11px;height:12px;background:repeating-linear-gradient(90deg,#1F3D2B 0 11px,transparent 11px 22px);-webkit-mask:radial-gradient(circle at 5.5px 0,#000 5px,transparent 6px) 0 0/22px 12px;mask:radial-gradient(circle at 5.5px 0,#000 5px,transparent 6px) 0 0/22px 12px"></div>
    </div>
    <div style="font-family:'Alfa Slab One',serif;font-size:16px;color:#1F3D2B;text-transform:uppercase;margin-top:18px">L'équipe</div>
    <div style="font-family:'Source Serif 4',serif;font-style:italic;font-size:13px;color:#6B5B45">le logo posé sur sa réserve,<br>bordée d'un lambrequin</div>
  </div>
</div>
"""

# ═══════════════════════════════════════════════════════════════════
#  UNIVERS 03 — GRAND AIR
# ═══════════════════════════════════════════════════════════════════
u3_apps = f"""
<div class="c7" style="background:#12211C">
  <span class="tag">Site internet · accueil</span>
  <img class="ph" src="{A['ferme']}" alt="" style="opacity:.72">
  <div class="vg" style="background:linear-gradient(90deg,rgba(18,33,28,.94) 18%,rgba(18,33,28,.15))"></div>
  <div class="pad" style="min-height:300px">
    <div style="display:flex;align-items:center;gap:12px">
      <img src="{LOGO}" alt="" style="width:42px">
      <div style="width:1px;height:30px;background:#3D4F48"></div>
      <div style="font-family:Outfit,sans-serif;font-weight:500;font-size:12px;color:#8FA69C;letter-spacing:.09em;line-height:1.4">MARDI — DIMANCHE<br><span style="color:#FBFAF7">10h — 17h</span></div>
    </div>
    <div style="font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:clamp(25px,3.9vw,42px);color:#FBFAF7;line-height:1.0;letter-spacing:-.025em;margin-top:8px">Le parc animalier,<br>nature et loisirs<br>de La Réunion.</div>
    <div style="font-family:Outfit,sans-serif;font-weight:300;font-size:15px;color:#B6C4BD;max-width:40ch;line-height:1.6">4,7 hectares dans la forêt protégée de l'Étang-Salé. Crocodiles du Nil, makis catta, paons bleus, mini-ferme et mini-golf.</div>
    <div style="display:flex;gap:9px;flex-wrap:wrap;margin-top:8px">
      <div style="background:#F2B705;color:#12211C;font-family:Outfit,sans-serif;font-weight:700;font-size:13px;padding:13px 24px">Réserver ma journée — 15 €</div>
      <div style="border:1px solid #3D4F48;color:#FBFAF7;font-family:Outfit,sans-serif;font-weight:500;font-size:13px;padding:12px 22px">Voir les animations</div>
    </div>
  </div>
</div>

<div class="c5" style="background:#FBFAF7">
  <span class="tag" style="background:rgba(255,255,255,.8);color:#111">Panneau d'orientation</span>
  <div class="pad" style="min-height:300px;justify-content:space-between">
    <img src="{LOGO}" alt="" style="width:72px;margin-top:16px">
    <div>
      <div style="font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:clamp(24px,3.4vw,36px);color:#12211C;line-height:1.02;letter-spacing:-.02em">Vous êtes<br>ici.</div>
      <div style="height:3px;width:46px;background:#2E7D5B;margin:14px 0 12px"></div>
      <div style="font-family:Outfit,sans-serif;font-weight:500;font-size:13.5px;color:#4E5B55;line-height:1.8">
        Crocodiles du Nil &nbsp;<span style="color:#0E7A55">—</span>&nbsp; 2 min<br>
        Mini-golf &nbsp;<span style="color:#0E7A55">—</span>&nbsp; 4 min<br>
        Maï-Taï Restaurant &nbsp;<span style="color:#0E7A55">—</span>&nbsp; 5 min</div>
    </div>
  </div>
</div>

<div class="c8" style="background:#FBFAF7">
  <span class="tag" style="background:rgba(255,255,255,.8);color:#111">Plan du parc · signalétique</span>
  <div class="plan">{plan("#FBFAF7", "#EDF2EF", "#C3D0CA", "#12211C", "#0E7A55", "Outfit, sans-serif", "#A9D9E2")}</div>
</div>

<div class="c4" style="background:#12211C">
  <span class="tag">Tarifs · ce qui est inclus</span>
  <div class="pad" style="min-height:300px;justify-content:center;gap:8px">
    <div style="font-family:Outfit,sans-serif;font-weight:700;font-size:11px;letter-spacing:.14em;color:#8FD9B8;text-transform:uppercase">Tarif unique · 15 €</div>
    <div style="font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:27px;color:#FBFAF7;line-height:1.02;letter-spacing:-.02em">La journée<br>entière</div>
    <div style="height:1px;background:#2C3D36;width:100%;margin:3px 0"></div>
    <div style="font-family:Outfit,sans-serif;font-weight:400;font-size:13.5px;color:#B6C4BD;line-height:1.9">
      Crocodiles du Nil, makis, paons<br>
      Jardin botanique &amp; plantes<br>
      Mini-golf, gonflables, aire de jeux<br>
      Croc'Snack &amp; Maï-Taï Restaurant</div>
    <div style="font-family:Outfit,sans-serif;font-weight:500;font-size:12px;color:#8FD9B8;margin-top:3px">Gratuit −3 ans · Scolaires 5 €</div>
  </div>
</div>

<div class="c4" style="background:#F2B705">
  <span class="tag" style="background:rgba(0,0,0,.4)">Story · vacances d'octobre</span>
  <div class="pad" style="min-height:280px;justify-content:space-between">
    <div style="font-family:Outfit,sans-serif;font-weight:700;font-size:11px;letter-spacing:.18em;color:#7A5E00;text-transform:uppercase;margin-top:14px">10 → 26 oct. · 7j/7</div>
    <div>
      <div style="font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:clamp(24px,3.2vw,36px);color:#12211C;line-height:.98;letter-spacing:-.03em">Une anim'<br>par jour.</div>
      <div style="font-family:Outfit,sans-serif;font-weight:400;font-size:14px;color:#3C3005;margin-top:10px;line-height:1.5">Nourrissage des crocodiles, chasse au trésor, atelier botanique.</div>
    </div>
  </div>
</div>

<div class="c4" style="background:#FBFAF7">
  <span class="tag" style="background:rgba(255,255,255,.8);color:#111">CSE, groupes &amp; écoles</span>
  <div class="pad" style="min-height:280px;justify-content:space-between">
    <div style="margin-top:14px;background:#E7F5EF;color:#0E7A55;font-family:Outfit,sans-serif;font-weight:700;font-size:10.5px;letter-spacing:.12em;padding:6px 12px;text-transform:uppercase;width:fit-content">Jours creux</div>
    <div>
      <div style="font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:27px;color:#12211C;line-height:1.0;letter-spacing:-.02em">CSE, groupes<br>&amp; écoles</div>
      <div style="font-family:Outfit,sans-serif;font-weight:400;font-size:13.5px;color:#4E5B55;margin-top:10px;line-height:1.6">Repas pré-commandé, zone dédiée, encadrement. Mardi, jeudi, vendredi.</div>
      <div style="font-family:Outfit,sans-serif;font-weight:700;font-size:13px;color:#0E7A55;margin-top:12px">Demander un devis</div>
    </div>
  </div>
</div>

<div class="c4" style="background:#12211C">
  <span class="tag">Billet · scan à l'entrée</span>
  <div class="padc" style="min-height:280px">
    <img src="{LOGO}" alt="" style="width:54px">
    <div style="font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:21px;color:#FBFAF7;letter-spacing:-.02em">Entrée · 15 €</div>
    <div style="width:106px;height:106px;background:#FBFAF7;display:flex;align-items:center;justify-content:center">
      <div style="width:80px;height:80px;background:repeating-linear-gradient(0deg,#12211C 0 6px,#FBFAF7 6px 12px),repeating-linear-gradient(90deg,#12211C 0 6px,#FBFAF7 6px 12px);background-blend-mode:difference"></div>
    </div>
    <div style="font-family:Outfit,sans-serif;font-weight:500;font-size:11.5px;letter-spacing:.09em;color:#8FD9B8;text-transform:uppercase">Adulte ou enfant dès 3 ans</div>
  </div>
</div>
"""

BODY = ""

# ── COVER + CORPS 01 ────────────────────────────────────────────────
BODY += cover(
    "01", "Noir Premium<br>&amp; Or", "#0A0A0A", "#F6F1E6",
    "Noir profond, ivoire, or mat. Peu de mots, beaucoup d'air, la photo toujours retravaillée. "
    "L'univers qui fait dire « ce lieu est sérieux » à une entreprise, un mariage, un salon.",
    ["#0A0A0A", "#C9A227", "#F6F1E6", "#3A3A38", "#8C7A3F"],
    "<b>Répond directement à Julien :</b> « ils ont refait tout leur parc, la charte graphique tout en noir premium ».",
    "u1",
)
BODY += univers(
    "u1",
    ["<b>Vendre l'événementiel</b> — privatisations, salons, mariages de jour.",
     "<b>Sortir du lot</b> : aucun parc de l'île ne joue ce registre.",
     "<b>Tenir dans le temps</b> — un classique vieillit lentement.",
     "<b>Signalétique haut de gamme</b> : gravure, laiton, bois foncé."],
    ["<b>Parler aux Gramoun</b> — trop distant pour un bal la poussière.",
     "<b>Rassurer sur le prix</b> — il donne plutôt l'impression que c'est cher.",
     "<b>Produire vite au quotidien</b> : chaque photo doit être irréprochable.",
     "<b>Les réseaux sociaux</b> — le registre y est moins spontané."],
    [("#0A0A0A", "Noir"), ("#C9A227", "Or mat"), ("#F6F1E6", "Ivoire"), ("#3A3A38", "Ardoise"), ("#8C7A3F", "Bronze")],
    [("Cormorant Garamond", "'Cormorant Garamond',serif",
      "Titres. En extérieur on l'emploie en graisse 600 : la finesse tient sur écran, pas à 3 m en plein soleil."),
     ("Jost", "Jost,sans-serif", "Textes, chiffres, signalétique. Neutre, elle laisse la serif briller.")],
    u1_apps,
    ["Crédibilise instantanément l'offre événementielle — <b>c'est là qu'est la marge</b>.",
     "Une identité que <b>ni Kélonia ni le Jardin d'Eden</b> ne pratiquent.",
     "Superbe en <b>signalétique gravée</b> et en documents commerciaux.",
     "Registre classique : il <b>vieillira lentement</b>."],
    ["Exige de <b>vraies photos bien tirées</b> — un mauvais cliché ruine l'effet.",
     "Peut paraître <b>froid pour une famille</b>, qui est le cœur de cible.",
     "Julien le dit lui-même : « <b>le noir premium, ça commence à dater</b> ».",
     "<b>Renforce la perception « trop cher »</b>, premier reproche de vos avis."],
)

# ── COVER + CORPS 02 ────────────────────────────────────────────────
BODY += cover(
    "02", "Lontan", "#1F3D2B", "#F4E9D7",
    "Terre cuite, vétiver, curcuma, papier crème. Les lambrequins de varangue deviennent un motif "
    "récurrent. L'univers de la fierté locale — celui qui parle aux familles réunionnaises et aux Gramoun.",
    ["#1F3D2B", "#B23A2E", "#E8B33C", "#F4E9D7", "#6B5B45"],
    "<b>Répond directement à Julien :</b> « j'aimerais bien qu'on travaille pas mal réunionnais ».",
    "u2",
)
BODY += univers(
    "u2",
    ["<b>Remplir les jours creux</b> — Gramoun, familles péi, clubs, CCAS.",
     "<b>Être impossible à copier</b> : l'identité est ancrée dans le territoire.",
     "<b>Toucher la diaspora</b> — 1 touriste sur 5 est un Réunionnais en visite.",
     "<b>Fournir un système graphique complet</b> : le lambrequin décline tout."],
    ["<b>Un dossier d'entreprise</b> — il faut une déclinaison sobre vétiver/papier.",
     "<b>Le dosage du créole</b> : mal employé, il sonne folklorique.",
     "<b>Les textes longs</b> — Alfa Slab One est réservée aux titres.",
     "<b>Le registre international</b>, si un jour c'est un objectif."],
    [("#1F3D2B", "Vétiver"), ("#B23A2E", "Terre cuite"), ("#E8B33C", "Curcuma"), ("#F4E9D7", "Papier"), ("#6B5B45", "Bois")],
    [("Alfa Slab One", "'Alfa Slab One',serif",
      "Titres. Slab épaisse et chaleureuse, excellente lisibilité de loin sur panneau."),
     ("Source Serif 4", "'Source Serif 4',serif", "Textes et légendes. Douce, très lisible en petit corps.")],
    u2_apps,
    ["<b>Impossible à copier</b> — elle est ancrée dans un territoire.",
     "Parle nativement aux <b>Gramoun</b> et aux <b>familles réunionnaises</b>.",
     "Le <b>lambrequin</b> est un système complet : frises, fonds, réserves.",
     "Excellente en <b>signalétique</b> et en <b>tenue d'équipe</b>."],
    ["Moins évidente pour un <b>dossier de privatisation</b> — déclinaison sobre à prévoir.",
     "Le créole doit être <b>validé par l'équipe</b> pour sonner juste.",
     "Demande un <b>traitement photo chaud</b> cohérent.",
     "Alfa Slab One est <b>très typée</b> : titres uniquement."],
)

# ── COVER + CORPS 03 ────────────────────────────────────────────────
BODY += cover(
    "03", "Grand Air", "#12211C", "#FBFAF7",
    "Vert forêt, vert vif, jaune solaire. Des blocs francs, l'information avant la séduction, "
    "la photo laissée brute. Le vocabulaire des parcs nationaux modernes — pensé pour le téléphone.",
    ["#12211C", "#2E7D5B", "#F2B705", "#FBFAF7", "#4E5B55"],
    "<b>Aucune demande explicite — c'est ma proposition.</b> L'univers qui performe là où se joue "
    "réellement le remplissage : le web, la billetterie, les réseaux.",
    "u3",
)
BODY += univers(
    "u3",
    ["<b>Le web et la billetterie</b> — de loin le plus efficace des trois.",
     "<b>Rassurer une famille</b> : l'info (horaires, tarif, durée) avant la vente.",
     "<b>Justifier les 15 €</b> en montrant tout ce qui est inclus.",
     "<b>Produire vite</b> — aucun traitement photo lourd nécessaire."],
    ["<b>Vendre une privatisation à 8 000 €</b> — c'est son vrai point faible.",
     "<b>Se distinguer</b> : le registre existe ailleurs, il est moins singulier.",
     "<b>Répondre au goût de Julien</b> — ce n'est pas ce qu'il a demandé.",
     "<b>Le cachet</b> : efficace plutôt que mémorable."],
    [("#12211C", "Forêt"), ("#2E7D5B", "Vert bois"), ("#F2B705", "Solaire"), ("#FBFAF7", "Blanc cassé"), ("#4E5B55", "Ardoise verte")],
    [("Bricolage Grotesque", "'Bricolage Grotesque',sans-serif",
      "Titres. Contemporaine et serrée, du caractère sans être bavarde."),
     ("Outfit", "Outfit,sans-serif", "Textes, interface, billetterie. Ronde et ouverte, excellente sur écran.")],
    u3_apps,
    ["<b>La plus efficace sur le web</b>, la billetterie et les réseaux.",
     "<b>La plus rassurante</b> pour une famille qui hésite.",
     "<b>La moins coûteuse</b> à produire au quotidien.",
     "Se décline naturellement en <b>pictogrammes de signalétique</b>."],
    ["<b>La moins premium</b> pour un dossier de privatisation.",
     "Registre <b>proche d'autres parcs modernes</b> — moins singulière que Lontan.",
     "Le vert doit <b>rester un accent</b>, sinon l'ensemble s'aplatit.",
     "<b>Ne répond pas au goût exprimé par Julien</b> — à assumer."],
)


# ═══════════════════════════════════════════════════════════════════
#  PARTIE 2 — PISTES DE LOGO
# ═══════════════════════════════════════════════════════════════════

# Silhouette de crocodile vue de dessus — base réutilisée
_UNUSED_CROCO_TOP = ("M10 40 L24 33 L42 31 L52 25 L60 12 L70 15 L63 27 L86 26 "
             "L98 21 L108 9 L118 12 L107 25 L130 31 L158 36 L190 40 "
             "L158 44 L130 49 L107 55 L118 68 L108 71 L98 59 L86 54 "
             "L63 53 L70 65 L60 68 L52 55 L42 49 L24 47 Z")

# Profil de tête de crocodile — museau, œil, mâchoire
CROCO_HEAD = ("M6 46 L54 40 L92 36 C104 34 116 34 126 38 L142 30 L150 40 "
              "L166 34 L172 46 L186 44 L184 56 C172 68 150 74 128 72 "
              "C104 70 78 64 52 58 L6 52 Z")


def logo_card(n, nom, desc, univers, force, stage_bg, svg_main, mini1, mini2, mini3):
    return f"""
<div class="lg">
  <div class="stage" style="background:{stage_bg}">{svg_main}</div>
  <div class="mini">
    <div style="background:#fff">{mini1}</div>
    <div style="background:#16161A">{mini2}</div>
    <div style="background:#F5F5F4">{mini3}</div>
  </div>
  <div class="tx">
    <div class="n">Piste {n}</div>
    <h5>{nom}</h5>
    <p>{desc}</p>
    <div class="meta"><b>Univers :</b> {univers}<br><b>Point fort :</b> {force}</div>
  </div>
</div>"""


# ── 2 · L'ÉCUSSON ───────────────────────────────────────────────────
L2 = f"""<svg width="240" height="180" viewBox="0 0 240 180" aria-label="L'Écusson">
  <path d="M120 8 L212 34 L212 96 C212 132 172 158 120 172 C68 158 28 132 28 96 L28 34 Z"
        fill="#1F3D2B"/>
  <path d="M120 16 L204 40 L204 95 C204 127 168 151 120 164 C72 151 36 127 36 95 L36 40 Z"
        fill="none" stroke="#E8B33C" stroke-width="1.6"/>
  <g transform="translate(44,50) scale(.60)" fill="#F4E9D7">
    <path d="M14 52 C14 40 24 32 40 30 L96 24 C118 22 136 28 148 40 L164 52 L146 56 C130 60 110 62 92 60 L44 66 C26 66 14 62 14 52 Z"/><path d="M20 64 C36 70 60 72 88 68 L146 58 L164 54 L146 70 C128 80 100 84 74 84 L38 82 C24 80 18 72 20 64 Z"/>
    <path d="M46 30 L52 18 L60 29 L68 17 L76 28 L84 16 L92 27" stroke="#F4E9D7" stroke-width="7" fill="none" stroke-linejoin="round"/>
  </g>
  <circle cx="72" cy="76" r="4.6" fill="#1F3D2B"/>
  <g stroke="#E8B33C" stroke-width="2.4" fill="none" stroke-linecap="round">
    <path d="M52 118 L52 96 M46 100 L52 92 L58 100 M46 108 L52 100 L58 108"/>
    <path d="M188 118 L188 96 M182 100 L188 92 L194 100 M182 108 L188 100 L194 108"/>
  </g>
  <text x="120" y="128" text-anchor="middle" font-family="Alfa Slab One, serif"
        font-size="21" fill="#F4E9D7" letter-spacing=".5">CROC PARC</text>
  <text x="120" y="146" text-anchor="middle" font-family="Source Serif 4, serif"
        font-size="9.5" letter-spacing="3" fill="#E8B33C">ÉTANG-SALÉ · DEPUIS 1999</text>
</svg>"""
L2m1 = """<svg width="42" height="52" viewBox="0 0 100 124">
  <path d="M50 4 L92 16 L92 60 C92 84 74 100 50 108 C26 100 8 84 8 60 L8 16 Z" fill="#1F3D2B"/>
  <g transform="translate(11,34) scale(.36)" fill="#F4E9D7"><path d="M14 52 C14 40 24 32 40 30 L96 24 C118 22 136 28 148 40 L164 52 L146 56 C130 60 110 62 92 60 L44 66 C26 66 14 62 14 52 Z"/><path d="M20 64 C36 70 60 72 88 68 L146 58 L164 54 L146 70 C128 80 100 84 74 84 L38 82 C24 80 18 72 20 64 Z"/></g>
  <text x="50" y="88" text-anchor="middle" font-family="Alfa Slab One, serif" font-size="11" fill="#F4E9D7">CP</text></svg>"""
L2m2 = """<svg width="42" height="52" viewBox="0 0 100 124">
  <path d="M50 4 L92 16 L92 60 C92 84 74 100 50 108 C26 100 8 84 8 60 L8 16 Z" fill="none" stroke="#E8B33C" stroke-width="3"/>
  <g transform="translate(11,34) scale(.36)" fill="#E8B33C"><path d="M14 52 C14 40 24 32 40 30 L96 24 C118 22 136 28 148 40 L164 52 L146 56 C130 60 110 62 92 60 L44 66 C26 66 14 62 14 52 Z"/><path d="M20 64 C36 70 60 72 88 68 L146 58 L164 54 L146 70 C128 80 100 84 74 84 L38 82 C24 80 18 72 20 64 Z"/></g></svg>"""
L2m3 = """<svg width="126" height="40" viewBox="0 0 300 96">
  <path d="M34 6 L74 18 L74 54 C74 74 56 86 34 92 C12 86 -6 74 -6 54 L-6 18 Z" fill="#1F3D2B" transform="translate(14,0)"/>
  <text x="104" y="52" font-family="Alfa Slab One, serif" font-size="26" fill="#1F3D2B">CROC PARC</text>
  <text x="105" y="70" font-family="Source Serif 4, serif" font-size="11" letter-spacing="2.6" fill="#8C7A3F">ÉTANG-SALÉ</text></svg>"""

# ── 3 · LA CRÊTE (monogramme) ───────────────────────────────────────
# Le C dont l'épaisseur du dos porte les écailles dorsales, découpées DANS la forme.
CRETE_C = ("M104 26 C92 10 70 3 50 7 C24 13 8 33 8 55 C8 77 24 97 50 103 "
           "C70 107 92 100 104 84 L104 62 C93 78 76 85 60 82 C42 78 32 68 32 55 "
           "C32 42 42 31 60 27 C76 24 93 31 104 47 Z")
CRETE_SCALES = ("M40 12 L46 -2 L54 11 L62 -3 L70 12 L79 -1 L88 15 L97 4 L106 21 "
                "L100 26 L92 14 L84 24 L76 12 L68 22 L60 11 L52 21 L44 12 Z")

L3 = f"""<svg width="330" height="130" viewBox="0 0 330 130" aria-label="La Crête">
  <g transform="translate(6,26)">
    <path d="{CRETE_C}" fill="#16130F"/>
    <path d="{CRETE_SCALES}" fill="#16130F"/>
    <path d="M104 47 L150 42 L166 52 L150 60 L104 62 Z" fill="#16130F"/>
    <path d="M104 62 L150 60 L166 52 L158 68 L140 72 L104 74 Z" fill="#16130F"/>
    <path d="M108 55 L152 51 L146 60 L136 53 L126 61 L116 54 Z" fill="#FBFAF7"/>
    <circle cx="86" cy="36" r="6" fill="#FBFAF7"/>
    <circle cx="86" cy="36" r="2.4" fill="#16130F"/>
  </g>
  <text x="186" y="60" font-family="Archivo, sans-serif" font-weight="800" font-size="37"
        letter-spacing="-1.6" fill="#16130F">CROC</text>
  <text x="186" y="98" font-family="Archivo, sans-serif" font-weight="400" font-size="37"
        letter-spacing="-1.6" fill="#2F6B4F">PARC</text>
</svg>"""
L3m1 = f"""<svg width="52" height="42" viewBox="0 0 180 130">
  <g transform="translate(6,18) scale(.94)">
    <path d="{CRETE_C}" fill="#16130F"/><path d="{CRETE_SCALES}" fill="#16130F"/>
    <path d="M104 47 L150 42 L166 52 L150 60 L104 62 Z" fill="#16130F"/>
    <path d="M104 62 L150 60 L166 52 L158 68 L140 72 L104 74 Z" fill="#16130F"/>
    <path d="M108 55 L152 51 L146 60 L136 53 L126 61 L116 54 Z" fill="#FBFAF7"/>
    <circle cx="86" cy="36" r="6" fill="#FBFAF7"/></g></svg>"""
L3m2 = f"""<svg width="52" height="42" viewBox="0 0 180 130">
  <rect width="180" height="130" fill="#2F6B4F"/>
  <g transform="translate(4,20) scale(.86)">
    <path d="{CRETE_C}" fill="#FBFAF7"/><path d="{CRETE_SCALES}" fill="#FBFAF7"/>
    <path d="M104 47 L150 42 L166 52 L150 60 L104 62 Z" fill="#FBFAF7"/>
    <path d="M104 62 L150 60 L166 52 L158 68 L140 72 L104 74 Z" fill="#FBFAF7"/>
    <path d="M108 55 L152 51 L146 60 L136 53 L126 61 L116 54 Z" fill="#2F6B4F"/></g></svg>"""
L3m3 = f"""<svg width="136" height="34" viewBox="0 0 360 90">
  <g transform="translate(2,12) scale(.48)">
    <path d="{CRETE_C}" fill="#16130F"/><path d="{CRETE_SCALES}" fill="#16130F"/>
    <path d="M104 47 L150 42 L166 52 L150 60 L104 62 Z" fill="#16130F"/>
    <path d="M104 62 L150 60 L166 52 L158 68 L140 72 L104 74 Z" fill="#16130F"/></g>
  <text x="96" y="58" font-family="Archivo, sans-serif" font-weight="800" font-size="31"
        letter-spacing="-1.3" fill="#16130F">CROC PARC</text></svg>"""

# ── 4 · LE SOURIRE ──────────────────────────────────────────────────
# Crocodile de FACE : museau large et bas, yeux perchés au-dessus du crâne.
L4 = """<svg width="310" height="150" viewBox="0 0 310 150" aria-label="Le Sourire">
  <g transform="translate(8,28)">
    <path d="M6 40 C6 26 18 16 36 14 L92 8 C118 5 142 12 156 26 L172 42 L146 46
              C132 48 116 48 100 46 L44 54 C22 56 6 52 6 40 Z" fill="#2E7D5B"/>
    <path d="M14 58 C30 62 56 62 86 58 L146 50 L172 46 L152 60 C138 70 116 76 92 78
              L44 82 C24 82 12 74 14 58 Z" fill="#1E5B41"/>
    <path d="M14 58 L172 46 L160 54 L146 47 L130 56 L114 50 L98 58 L82 52 L66 60
             L50 54 L34 62 L20 56 Z" fill="#FBFAF7"/>
    <path d="M44 14 L50 2 L58 13 L66 1 L74 12 L82 0 L90 11" fill="#256A4C"/>
    <circle cx="46" cy="32" r="11" fill="#FBFAF7"/>
    <circle cx="49" cy="33" r="4.6" fill="#12211C"/>
    <ellipse cx="160" cy="33" rx="5" ry="3.4" fill="#123D2C"/>
  </g>
  <text x="196" y="70" font-family="Bricolage Grotesque, sans-serif" font-weight="800"
        font-size="30" letter-spacing="-1.3" fill="#12211C">CROC</text>
  <text x="196" y="102" font-family="Bricolage Grotesque, sans-serif" font-weight="600"
        font-size="30" letter-spacing="-1.3" fill="#2E7D5B">PARC</text>
</svg>"""
L4m1 = """<svg width="60" height="38" viewBox="0 0 190 100">
  <g transform="translate(4,10)">
    <path d="M6 40 C6 26 18 16 36 14 L92 8 C118 5 142 12 156 26 L172 42 L146 46
              C132 48 116 48 100 46 L44 54 C22 56 6 52 6 40 Z" fill="#2E7D5B"/>
    <path d="M14 58 C30 62 56 62 86 58 L146 50 L172 46 L152 60 C138 70 116 76 92 78
              L44 82 C24 82 12 74 14 58 Z" fill="#1E5B41"/>
    <path d="M14 58 L172 46 L160 54 L146 47 L130 56 L114 50 L98 58 L82 52 L66 60
             L50 54 L34 62 L20 56 Z" fill="#FBFAF7"/>
    <path d="M44 14 L50 2 L58 13 L66 1 L74 12 L82 0 L90 11" fill="#256A4C"/>
    <circle cx="46" cy="32" r="11" fill="#FBFAF7"/>
    <circle cx="49" cy="33" r="4.6" fill="#12211C"/>
    <ellipse cx="160" cy="33" rx="5" ry="3.4" fill="#123D2C"/>
  </g></svg>"""
L4m2 = """<svg width="60" height="38" viewBox="0 0 190 100">
  <g transform="translate(4,10)">
    <path d="M6 40 C6 26 18 16 36 14 L92 8 C118 5 142 12 156 26 L172 42 L146 46
              C132 48 116 48 100 46 L44 54 C22 56 6 52 6 40 Z" fill="#FBFAF7"/>
    <path d="M14 58 C30 62 56 62 86 58 L146 50 L172 46 L152 60 C138 70 116 76 92 78
              L44 82 C24 82 12 74 14 58 Z" fill="#C9CFCB"/>
    <path d="M14 58 L172 46 L160 54 L146 47 L130 56 L114 50 L98 58 L82 52 L66 60
             L50 54 L34 62 L20 56 Z" fill="#16161A"/>
    <path d="M44 14 L50 2 L58 13 L66 1 L74 12 L82 0 L90 11" fill="#FBFAF7"/>
    <circle cx="46" cy="32" r="11" fill="#16161A"/>
    <circle cx="49" cy="33" r="4.6" fill="#FBFAF7"/>
    <ellipse cx="160" cy="33" rx="5" ry="3.4" fill="#16161A"/>
  </g></svg>"""
L4m3 = """<svg width="136" height="38" viewBox="0 0 350 100">
  <g transform="translate(2,16) scale(.62)">
    <path d="M6 40 C6 26 18 16 36 14 L92 8 C118 5 142 12 156 26 L172 42 L146 46
              C132 48 116 48 100 46 L44 54 C22 56 6 52 6 40 Z" fill="#2E7D5B"/>
    <path d="M14 58 C30 62 56 62 86 58 L146 50 L172 46 L152 60 C138 70 116 76 92 78
              L44 82 C24 82 12 74 14 58 Z" fill="#1E5B41"/>
    <path d="M14 58 L172 46 L160 54 L146 47 L130 56 L114 50 L98 58 L82 52 L66 60
             L50 54 L34 62 L20 56 Z" fill="#FBFAF7"/>
    <path d="M44 14 L50 2 L58 13 L66 1 L74 12 L82 0 L90 11" fill="#256A4C"/>
    <circle cx="46" cy="32" r="11" fill="#FBFAF7"/>
    <circle cx="49" cy="33" r="4.6" fill="#12211C"/>
    <ellipse cx="160" cy="33" rx="5" ry="3.4" fill="#123D2C"/>
  </g>
  <text x="124" y="60" font-family="Bricolage Grotesque, sans-serif" font-weight="800"
        font-size="30" letter-spacing="-1.2" fill="#12211C">CROC PARC</text></svg>"""

# ── 5 · L'ŒIL ───────────────────────────────────────────────────────
L5 = """<svg width="280" height="140" viewBox="0 0 280 140" aria-label="L'Œil">
  <g transform="translate(8,18)">
    <rect x="0" y="0" width="106" height="106" fill="#0A0A0A"/>
    <path d="M8 52 C22 34 40 26 56 26 C74 26 92 36 100 52 C92 68 74 78 56 78 C40 78 22 70 8 52 Z"
          fill="#C9A227"/>
    <path d="M54 28 C62 38 62 66 54 76 C46 66 46 38 54 28 Z" fill="#0A0A0A"/>
    <g stroke="#0A0A0A" stroke-width="2.4" fill="none" opacity=".55">
      <path d="M16 44 L26 40 M32 36 L42 33 M70 34 L80 38 M86 42 L96 47"/>
      <path d="M18 62 L28 66 M34 70 L44 73 M70 72 L80 68 M86 64 L96 60"/>
    </g>
  </g>
  <text x="132" y="62" font-family="Cormorant Garamond, serif" font-weight="600"
        font-size="40" letter-spacing="1" fill="#0A0A0A">CROC</text>
  <text x="132" y="98" font-family="Cormorant Garamond, serif" font-weight="400"
        font-size="40" letter-spacing="9" fill="#8C7A3F">PARC</text>
  <line x1="133" y1="110" x2="264" y2="110" stroke="#C9A227" stroke-width="1"/>
</svg>"""
L5m1 = """<svg width="46" height="46" viewBox="0 0 106 106">
  <rect width="106" height="106" fill="#0A0A0A"/>
  <path d="M8 52 C22 34 40 26 56 26 C74 26 92 36 100 52 C92 68 74 78 56 78 C40 78 22 70 8 52 Z" fill="#C9A227"/>
  <path d="M54 28 C62 38 62 66 54 76 C46 66 46 38 54 28 Z" fill="#0A0A0A"/></svg>"""
L5m2 = """<svg width="46" height="46" viewBox="0 0 106 106">
  <rect width="106" height="106" fill="#C9A227"/>
  <path d="M8 52 C22 34 40 26 56 26 C74 26 92 36 100 52 C92 68 74 78 56 78 C40 78 22 70 8 52 Z" fill="#0A0A0A"/>
  <path d="M54 28 C62 38 62 66 54 76 C46 66 46 38 54 28 Z" fill="#C9A227"/></svg>"""
L5m3 = """<svg width="128" height="38" viewBox="0 0 320 96">
  <rect x="0" y="10" width="76" height="76" fill="#0A0A0A"/>
  <path d="M6 48 C16 36 30 30 42 30 C55 30 68 37 74 48 C68 59 55 66 42 66 C30 66 16 60 6 48 Z" fill="#C9A227"/>
  <path d="M40 32 C46 39 46 57 40 64 C34 57 34 39 40 32 Z" fill="#0A0A0A"/>
  <text x="94" y="62" font-family="Cormorant Garamond, serif" font-weight="600" font-size="36" fill="#0A0A0A">CROC PARC</text></svg>"""

# ── 6 · LA LIGNE D'EAU ──────────────────────────────────────────────
L6 = """<svg width="320" height="150" viewBox="0 0 320 150" aria-label="La Ligne d'eau">
  <g transform="translate(6,22)">
    <path d="M2 50 C22 44 48 40 78 40 C104 40 126 43 142 48 L162 44 L166 52 L142 56
              C126 61 104 64 78 64 C48 64 22 58 2 50 Z" fill="#12211C"/>
    <path d="M52 40 L58 26 L66 39 M74 39 L82 24 L90 39 M98 41 L106 28 L113 42" fill="#12211C"/>
    <circle cx="150" cy="49" r="3.4" fill="#2E7D5B"/>
    <rect x="0" y="66" width="176" height="3.4" fill="#2E7D5B"/>
    <g opacity=".38">
      <path d="M8 74 C28 80 50 84 78 84 C104 84 126 80 142 75 L160 78
               C140 88 110 94 78 94 C48 94 24 86 8 74 Z" fill="#2E7D5B"/>
    </g>
  </g>
  <text x="196" y="72" font-family="Outfit, sans-serif" font-weight="900" font-size="27"
        letter-spacing="-1.1" fill="#12211C">CROC</text>
  <text x="196" y="102" font-family="Outfit, sans-serif" font-weight="900" font-size="27"
        letter-spacing="-1.1" fill="#12211C">PARC</text>
  <text x="0" y="140" font-family="Outfit, sans-serif" font-weight="500" font-size="10.5"
        letter-spacing="4" fill="#4E5B55">NATURE &amp; LOISIRS · LA RÉUNION</text>
</svg>"""
L6m1 = """<svg width="60" height="38" viewBox="0 0 180 104">
  <g transform="translate(2,4)">
    <path d="M2 50 C22 44 48 40 78 40 C104 40 126 43 142 48 L162 44 L166 52 L142 56
              C126 61 104 64 78 64 C48 64 22 58 2 50 Z" fill="#12211C"/>
    <path d="M52 40 L58 26 L66 39 M74 39 L82 24 L90 39 M98 41 L106 28 L113 42" fill="#12211C"/>
    <circle cx="150" cy="49" r="3.4" fill="#2E7D5B"/>
    <rect x="0" y="66" width="176" height="3.4" fill="#2E7D5B"/>
    <g opacity=".38">
      <path d="M8 74 C28 80 50 84 78 84 C104 84 126 80 142 75 L160 78
               C140 88 110 94 78 94 C48 94 24 86 8 74 Z" fill="#2E7D5B"/>
    </g>
  </g></svg>"""
L6m2 = """<svg width="60" height="38" viewBox="0 0 180 104">
  <g transform="translate(2,4)">
    <path d="M2 50 C22 44 48 40 78 40 C104 40 126 43 142 48 L162 44 L166 52 L142 56
              C126 61 104 64 78 64 C48 64 22 58 2 50 Z" fill="#FBFAF7"/>
    <path d="M52 40 L58 26 L66 39 M74 39 L82 24 L90 39 M98 41 L106 28 L113 42" fill="#FBFAF7"/>
    <circle cx="150" cy="49" r="3.4" fill="#8FD9B8"/>
    <rect x="0" y="66" width="176" height="3.4" fill="#8FD9B8"/>
    <g opacity=".34">
      <path d="M8 74 C28 80 50 84 78 84 C104 84 126 80 142 75 L160 78
               C140 88 110 94 78 94 C48 94 24 86 8 74 Z" fill="#8FD9B8"/>
    </g>
  </g></svg>"""
L6m3 = """<svg width="136" height="36" viewBox="0 0 350 94">
  <g transform="translate(2,12) scale(.62)">
    <path d="M2 50 C22 44 48 40 78 40 C104 40 126 43 142 48 L162 44 L166 52 L142 56
              C126 61 104 64 78 64 C48 64 22 58 2 50 Z" fill="#12211C"/>
    <path d="M52 40 L58 26 L66 39 M74 39 L82 24 L90 39 M98 41 L106 28 L113 42" fill="#12211C"/>
    <circle cx="150" cy="49" r="3.4" fill="#2E7D5B"/>
    <rect x="0" y="66" width="176" height="3.4" fill="#2E7D5B"/>
    <g opacity=".32">
      <path d="M8 74 C28 80 50 84 78 84 C104 84 126 80 142 75 L160 78
               C140 88 110 94 78 94 C48 94 24 86 8 74 Z" fill="#2E7D5B"/>
    </g>
  </g>
  <text x="122" y="58" font-family="Outfit, sans-serif" font-weight="900" font-size="29"
        letter-spacing="-1.2" fill="#12211C">CROC PARC</text></svg>"""

# ── 7 · LE CACHET ───────────────────────────────────────────────────
L7 = f"""<svg width="250" height="170" viewBox="0 0 250 170" aria-label="Le Cachet">
  <rect x="10" y="14" width="140" height="140" fill="#B23A2E"/>
  <rect x="18" y="22" width="124" height="124" fill="none" stroke="#F4E9D7" stroke-width="1.4"/>
  <g transform="translate(26,54) scale(.56)" fill="#F4E9D7">
    <path d="M14 52 C14 40 24 32 40 30 L96 24 C118 22 136 28 148 40 L164 52 L146 56 C130 60 110 62 92 60 L44 66 C26 66 14 62 14 52 Z"/><path d="M20 64 C36 70 60 72 88 68 L146 58 L164 54 L146 70 C128 80 100 84 74 84 L38 82 C24 80 18 72 20 64 Z"/><path d="M46 30 L52 18 L60 29 L68 17 L76 28 L84 16 L92 27" stroke="#F4E9D7" stroke-width="7" fill="none" stroke-linejoin="round"/>
  </g>
  <circle cx="55" cy="80" r="5" fill="#B23A2E"/>
  <text x="80" y="42" text-anchor="middle" font-family="Alfa Slab One, serif"
        font-size="13" fill="#F4E9D7" letter-spacing="1.4">CROC PARC</text>
  <text x="80" y="132" text-anchor="middle" font-family="Source Serif 4, serif"
        font-size="8.5" letter-spacing="2.4" fill="#F4C860">ÉTANG-SALÉ · 1999</text>
  <text x="166" y="72" font-family="Alfa Slab One, serif" font-size="25" fill="#1F3D2B">CROC</text>
  <text x="166" y="102" font-family="Alfa Slab One, serif" font-size="25" fill="#B23A2E">PARC</text>
</svg>"""
L7m1 = f"""<svg width="44" height="44" viewBox="0 0 110 110">
  <rect width="110" height="110" fill="#B23A2E"/>
  <rect x="6" y="6" width="98" height="98" fill="none" stroke="#F4E9D7" stroke-width="1.4"/>
  <g transform="translate(10,32) scale(.42)" fill="#F4E9D7">
    <path d="M14 52 C14 40 24 32 40 30 L96 24 C118 22 136 28 148 40 L164 52 L146 56 C130 60 110 62 92 60 L44 66 C26 66 14 62 14 52 Z"/><path d="M20 64 C36 70 60 72 88 68 L146 58 L164 54 L146 70 C128 80 100 84 74 84 L38 82 C24 80 18 72 20 64 Z"/></g>
  <text x="55" y="24" text-anchor="middle" font-family="Alfa Slab One, serif" font-size="11" fill="#F4E9D7">CP</text></svg>"""
L7m2 = f"""<svg width="44" height="44" viewBox="0 0 110 110">
  <rect width="110" height="110" fill="none" stroke="#F4C860" stroke-width="3"/>
  <g transform="translate(10,32) scale(.42)" fill="#F4C860">
    <path d="M14 52 C14 40 24 32 40 30 L96 24 C118 22 136 28 148 40 L164 52 L146 56 C130 60 110 62 92 60 L44 66 C26 66 14 62 14 52 Z"/><path d="M20 64 C36 70 60 72 88 68 L146 58 L164 54 L146 70 C128 80 100 84 74 84 L38 82 C24 80 18 72 20 64 Z"/></g></svg>"""
L7m3 = f"""<svg width="126" height="40" viewBox="0 0 300 96">
  <rect x="4" y="8" width="80" height="80" fill="#B23A2E"/>
  <g transform="translate(6,28) scale(.34)" fill="#F4E9D7">
    <path d="M14 52 C14 40 24 32 40 30 L96 24 C118 22 136 28 148 40 L164 52 L146 56 C130 60 110 62 92 60 L44 66 C26 66 14 62 14 52 Z"/><path d="M20 64 C36 70 60 72 88 68 L146 58 L164 54 L146 70 C128 80 100 84 74 84 L38 82 C24 80 18 72 20 64 Z"/></g>
  <text x="100" y="48" font-family="Alfa Slab One, serif" font-size="24" fill="#1F3D2B">CROC</text>
  <text x="100" y="76" font-family="Alfa Slab One, serif" font-size="24" fill="#B23A2E">PARC</text></svg>"""


LOGOS = f"""
<section class="cover" id="logos" style="background:#F5F5F4;color:#16161A">
  <div class="wrap" style="padding-left:0;padding-right:0">
    <div class="tl">Seconde partie</div>
    <div class="nm" style="margin-top:0">Six pistes<br>de logo</div>
    <div class="pitch">Le crocodile reste — c'est votre nom et votre animal. Ce qui change,
    c'est <b>la façon de le dessiner</b> : plus net, plus simple, utilisable partout.</div>
    <div class="ans" style="border-color:#16161A33">
      <b>Rien n'est définitif.</b> Chaque piste est montrée en trois usages :
      couleur, monochrome (broderie, tampon, une seule encre) et version horizontale réduite.
      Dites-moi celle qui vous parle — même à moitié.
    </div>
  </div>
</section>

<div class="wrap"><section class="blk">
  <div class="note">
    <p><b>Ce qui a guidé les six pistes.</b> Le logo actuel est <b>trop détaillé</b> : il devient
    illisible en petit, il ne s'imprime pas en une seule couleur, et il ne se brode pas.
    Les six propositions ci-dessous passent ces trois tests.</p>
    <p><b>Le crocodile est conservé partout</b> — redessiné en formes simples et franches.
    Certaines pistes gardent une baseline, d'autres non : à vous de dire ce que vous préférez.</p>
    <p><b>Vous pouvez aussi croiser deux pistes</b> — par exemple le crocodile de La Ligne d'eau
    posé dans le blason de L'Écusson. Dites simplement ce qui vous plaît, je m'occupe du reste.</p>
  </div>

  <div class="logos">
    {logo_card("1", "L'Écusson",
      "Le vocabulaire des <b>parcs nationaux</b> : un blason, deux filaos, la date de création. Il installe l'idée d'un <b>lieu protégé et institué</b> — utile face aux écoles, aux collectivités et à la mairie.",
      "Lontan", "Crédibilité institutionnelle — parfait pour les dossiers et partenariats",
      "#F4E9D7", L2, L2m1, L2m2, L2m3)}

    {logo_card("2", "La Crête",
      "Le <b>C de Croc</b> devient le corps du crocodile : dos crénelé, museau, dents. <b>Une seule forme</b>, mémorisable en une seconde, du pin's au panneau de 3 mètres.",
      "Grand Air / Noir Premium", "Mémorisation — une forme, un signe, reconnaissable de loin",
      "#FBFAF7", L3, L3m1, L3m2, L3m3)}

    {logo_card("3", "Le Sourire",
      "Une tête de profil, gueule ouverte, sourire franc. C'est la piste qui <b>parle directement aux enfants</b> — et les <b>anniversaires</b> sont ce que vos avis citent le plus souvent.",
      "Grand Air", "Le public famille et enfants — votre cœur de cible",
      "#F5F5F4", L4, L4m1, L4m2, L4m3)}

    {logo_card("4", "L'Œil",
      "Un gros plan sur l'œil du crocodile du Nil. La piste la <b>plus adulte et la plus graphique</b> : elle ne raconte pas un parc de loisirs, elle raconte <b>un animal impressionnant</b>.",
      "Noir Premium", "Prestige et impact — la plus forte pour l'événementiel",
      "#F5F5F4", L5, L5m1, L5m2, L5m3)}

    {logo_card("5", "La Ligne d'eau",
      "Le crocodile affleure la surface, son reflet dessous. La ligne devient un <b>élément graphique réutilisable</b> partout : soulignement, séparateur, bord de panneau.",
      "Grand Air", "Un système graphique complet, pas seulement un logo",
      "#FBFAF7", L6, L6m1, L6m2, L6m3)}

    {logo_card("6", "Le Cachet",
      "Un tampon carré qui évoque <b>l'authenticité et l'ancrage local</b>. Il se pose comme une marque sur un menu, un billet, un sac ou un t-shirt — et <b>fonctionne en une seule encre</b>.",
      "Lontan", "Ancrage local et polyvalence — excellent en merchandising",
      "#F4E9D7", L7, L7m1, L7m2, L7m3)}
  </div>

  <div class="note" style="margin-top:30px">
    <p><b>Mon avis, si ça vous aide.</b> <b>La Ligne d'eau</b> et <b>La Crête</b> sont les plus solides
    techniquement — ce sont ceux qui vous coûteront le moins cher à décliner sur dix ans.
    <b>Le Sourire</b> est celui qui parlera le plus à vos visiteurs actuels, et les anniversaires
    sont votre point fort. <b>L'Œil</b> est le plus fort si vous choisissez Noir Premium.</p>

  </div>
</section></div>
"""


# ═══════════════════════════════════════════════════════════════════
#  CHOIX / SYNTHÈSE
# ═══════════════════════════════════════════════════════════════════
TEST_3M = f"""
<div class="wrap"><section class="blk pagebreak">
  <h2 class="doc">Le test des 3 mètres</h2>
  <p class="l">Un logo se juge sur un panneau, pas sur un écran. Voici les six pistes
  <b>à la taille réelle où on les verra</b> — en tout petit sur un polo brodé, et en grand
  sur un panneau d'orientation. <b>Celles qui survivent aux deux sont les bonnes.</b></p>

  <div style="border:1px solid var(--line);margin-top:22px">
    <div style="padding:16px 22px;border-bottom:1px solid var(--line2);background:var(--doc2)">
      <b style="font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--mut)">
      1 · Brodé sur un polo — 12 mm de haut, une seule couleur</b></div>
    <div style="display:flex;flex-wrap:wrap;gap:0;align-items:center;background:#1F3D2B">
      <div style="padding:22px 18px;flex:1;min-width:110px;text-align:center;border-right:1px solid rgba(255,255,255,.10)">{L2m2}<div style="font-family:Archivo,sans-serif;font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:#8FA69C;margin-top:10px">L'Écusson</div></div><div style="padding:22px 18px;flex:1;min-width:110px;text-align:center;border-right:1px solid rgba(255,255,255,.10)">{L3m2}<div style="font-family:Archivo,sans-serif;font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:#8FA69C;margin-top:10px">La Crête</div></div><div style="padding:22px 18px;flex:1;min-width:110px;text-align:center;border-right:1px solid rgba(255,255,255,.10)">{L4m2}<div style="font-family:Archivo,sans-serif;font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:#8FA69C;margin-top:10px">Le Sourire</div></div><div style="padding:22px 18px;flex:1;min-width:110px;text-align:center;border-right:1px solid rgba(255,255,255,.10)">{L5m2}<div style="font-family:Archivo,sans-serif;font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:#8FA69C;margin-top:10px">L'Œil</div></div><div style="padding:22px 18px;flex:1;min-width:110px;text-align:center;border-right:1px solid rgba(255,255,255,.10)">{L6m2}<div style="font-family:Archivo,sans-serif;font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:#8FA69C;margin-top:10px">La Ligne d'eau</div></div><div style="padding:22px 18px;flex:1;min-width:110px;text-align:center;border-right:1px solid rgba(255,255,255,.10)">{L7m2}<div style="font-family:Archivo,sans-serif;font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:#8FA69C;margin-top:10px">Le Cachet</div></div>
    </div>
  </div>

  <div style="border:1px solid var(--line);border-top:0">
    <div style="padding:16px 22px;border-bottom:1px solid var(--line2);background:var(--doc2)">
      <b style="font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--mut)">
      2 · Panneau d'entrée vu à 3 mètres</b></div>
    <div style="background:#0A0A0A;padding:38px 30px;display:flex;flex-direction:column;
                align-items:center;gap:20px;min-height:230px;justify-content:center">
      <div style="display:flex;gap:34px;flex-wrap:wrap;justify-content:center;align-items:center"><div style="transform:scale(1.9);transform-origin:center">{L6m2}</div><div style="transform:scale(1.9);transform-origin:center">{L3m2}</div><div style="transform:scale(1.9);transform-origin:center">{L4m2}</div></div>
      <div style="font-family:Jost,sans-serif;font-weight:500;font-size:13px;letter-spacing:.26em;
                  color:#C9A227;text-transform:uppercase">Ouvert · 10h — 17h</div>
    </div>
  </div>

  <div class="note" style="margin-top:24px">
    <p><b>Ce que ce test montre.</b> Les pistes qui gardent une <b>silhouette pleine et simple</b>
    (La Ligne d'eau, La Crête, Le Cachet) restent lisibles partout. Celles qui ont des
    <b>détails fins</b> (les dents du Sourire, les écailles de L'Œil, la baseline de L'Écusson)
    demanderont une <b>version simplifiée</b> pour les petits formats — c'est normal, ça se
    prépare, et je le ferai pour la piste que vous choisirez.</p>
  </div>
</section></div>
"""

CHOIX = """
<div class="wrap"><section class="blk pagebreak" id="choix">
  <h2 class="doc">Les trois univers, face à face</h2>
  <p class="l">Aucun n'est meilleur dans l'absolu. Ils servent <b>des priorités différentes</b>.</p>

  <table>
    <tr><th></th><th>01 Noir Premium</th><th>02 Lontan</th><th>03 Grand Air</th></tr>
    <tr><td>Vendre l'événementiel</td><td><b>Excellent</b></td><td>Correct</td><td>Moyen</td></tr>
    <tr><td>Parler aux familles</td><td>Moyen</td><td><b>Excellent</b></td><td><b>Excellent</b></td></tr>
    <tr><td>Parler aux Gramoun</td><td>Faible</td><td><b>Excellent</b></td><td>Correct</td></tr>
    <tr><td>Réseaux sociaux</td><td>Correct</td><td>Bon</td><td><b>Excellent</b></td></tr>
    <tr><td>Site &amp; billetterie</td><td>Moyen</td><td>Correct</td><td><b>Excellent</b></td></tr>
    <tr><td>Signalétique du parc</td><td><b>Excellent</b></td><td><b>Excellent</b></td><td>Bon</td></tr>
    <tr><td>Justifier les 15 €</td><td>Bon</td><td>Correct</td><td><b>Excellent</b></td></tr>
    <tr><td>Singularité sur l'île</td><td>Forte</td><td><b>Très forte</b></td><td>Moyenne</td></tr>
    <tr><td>Coût au quotidien</td><td>Élevé (photo)</td><td>Moyen</td><td><b>Faible</b></td></tr>
    <tr><td>Demandé par Julien</td><td><b>Oui — « noir premium »</b></td><td><b>Oui — « réunionnais »</b></td><td>Non — ma proposition</td></tr>
  </table>

  <h3 class="doc" style="margin-top:40px">Mon avis, franchement</h3>
  <div class="note">
    <p><b>Julien, Noir Premium va sûrement te parler</b> — c'est ta référence, et elle est juste :
    c'est l'univers qui vend le mieux une privatisation, un salon, un mariage. Si c'est celui-là,
    on y va, il est solide.</p>
    <p><b>Mais pour le problème n°1 que vous m'avez décrit — remplir les mardis, jeudis et vendredis —
    c'est Lontan qui le sert le mieux.</b> Il parle nativement aux Gramoun, aux familles péi et
    à la diaspora. Il est impossible à copier. Et il coûte moins cher à produire au quotidien.</p>
    <p><b>Un point à dire :</b> « prix trop élevé » revient souvent dans vos avis, avec 15 € par
    personne dès 3 ans. Noir Premium est magnifique mais il <b>renforce</b> cette perception.
    Lontan et Grand Air la neutralisent. Ce n'est pas une raison d'écarter Noir Premium —
    c'est une raison d'en parler ensemble.</p>
  </div>

  <h3 class="doc" style="margin-top:40px">Ce dont j'ai besoin de vous</h3>
  <div class="facts" style="margin-top:14px">
    <div><b>1 · Un univers</b><span><em>01, 02 ou 03</em> — ou un mélange, c'est permis.</span></div>
    <div><b>2 · Une piste de logo</b><span>Un numéro suffit. <em>Ou deux à croiser.</em></span></div>
    <div><b>3 · Les plans du parc</b><span>Au <em>1/1000e, PDF + DWG</em>, pour finir la carte.</span></div>
    <div><b>4 · La référence de Julien</b><span>Le nom du parc <em>« refait tout en noir premium »</em>.</span></div>
  </div>

  <h3 class="doc" style="margin-top:36px">Ce qui se passe ensuite</h3>
  <p class="l"><b>Je pousse un seul univers jusqu'au bout</b> : règles d'usage, logo finalisé en
  fichiers vectoriels, déclinaison signalétique chiffrée pour les deux entrées et la scène,
  gabarits Instagram et Facebook, modèle de document groupes — et
  <b>l'affiche des vacances d'octobre</b>, qui sortira directement dans la nouvelle charte.</p>
</section></div>

<div class="wrap"><footer>
  <b>Un mot pour finir.</b> Ce document n'est pas une proposition à prendre ou à laisser.
  Tout est ajustable, à n'importe quel moment — une couleur, un mot, une piste entière.
  <b>N'hésitez jamais à me dire de réajuster</b> : le but est qu'on avance ensemble dans la même
  direction, et vos retours font gagner du temps à tout le monde.<br><br>
  <span class="sm">Croc Parc · 1 route forestière, 97427 L'Étang-Salé · Document de travail préparé
  par Jonathan — communication, événementiel, digital.</span>
</footer></div>

</body>
</html>
"""

html = HEAD.replace("__LOGO__", LOGO) + BODY + LOGOS + TEST_3M + CHOIX
OUT.write_text(html, encoding="utf-8")
print("OK", OUT, len(html) // 1024, "KB")
