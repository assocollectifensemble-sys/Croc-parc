/* ═══════════════════════════════════════════════════════════
   CROC PARC — 6 logos, en SVG monochrome adaptatif
   Chaque logo utilise currentColor : il prend automatiquement
   la couleur de l'univers actif (or, terre cuite, vert…).
   ═══════════════════════════════════════════════════════════ */

const CP_LOGOS = {

  /* ── 0 · LOGO RETENU (image détourée, fond transparent) ── */
  officiel: {
    nom: "Le Retenu",
    desc: "Mascotte premium détourée — le logo validé",
    ratio: 0.98,
    raster: "img/crocparc-logo.png",
    svg: `<svg viewBox="0 0 848 868" xmlns="http://www.w3.org/2000/svg" aria-label="Croc Parc &amp; Cie">
      <image href="img/crocparc-logo.png" x="0" y="0" width="848" height="868"/>
    </svg>`
  },

  /* ── 0b · VARIANTE TROPICALE ─────────────────────────── */
  officielTropical: {
    nom: "Le Tropical",
    desc: "Variante jungle et orchidées — bras ouverts",
    ratio: 1.02,
    raster: "img/crocparc-logo-kraft.png",
    svg: `<svg viewBox="0 0 954 931" xmlns="http://www.w3.org/2000/svg" aria-label="Croc Parc &amp; Cie">
      <image href="img/crocparc-logo-kraft.png" x="0" y="0" width="954" height="931"/>
    </svg>`
  },

  /* ── 1 · L'ÉCUSSON ─────────────────────────────────────── */
  ecusson: {
    nom: "L'Écusson",
    desc: "Blason de parc protégé — crédibilité institutionnelle",
    ratio: 0.82,
    svg: `<svg viewBox="0 0 200 244" xmlns="http://www.w3.org/2000/svg" aria-label="Croc Parc">
      <path d="M100 6 L188 32 L188 128 C188 176 150 212 100 232 C50 212 12 176 12 128 L12 32 Z"
            fill="currentColor"/>
      <g fill="var(--logo-neg,#fff)">
        <path d="M42 118 C42 108 50 101 63 99 L108 94 C126 92 141 97 151 107 L164 118 L149 121
                 C136 125 120 126 105 125 L66 130 C51 130 42 126 42 118 Z"/>
        <path d="M47 128 C60 133 80 135 103 132 L149 123 L164 120 L149 133 C134 141 111 145 90 145
                 L60 143 C48 142 45 135 47 128 Z"/>
        <path d="M68 99 L73 89 L80 98 L86 88 L93 97 L99 87 L106 96" stroke="var(--logo-neg,#fff)"
              stroke-width="6" fill="none" stroke-linejoin="round"/>
      </g>
      <circle cx="70" cy="112" r="4" fill="currentColor"/>
      <g stroke="var(--logo-neg,#fff)" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".72">
        <path d="M34 172 L34 148 M28 152 L34 144 L40 152 M28 160 L34 152 L40 160"/>
        <path d="M166 172 L166 148 M160 152 L166 144 L172 152 M160 160 L166 152 L172 160"/>
      </g>
      <text x="100" y="60" text-anchor="middle" font-family="var(--logo-ft,serif)"
            font-size="23" font-weight="700" fill="var(--logo-neg,#fff)" letter-spacing="1">CROC PARC</text>
      <text x="100" y="192" text-anchor="middle" font-family="var(--logo-fb,sans-serif)"
            font-size="10" letter-spacing="3" fill="var(--logo-neg,#fff)" opacity=".82">ÉTANG-SALÉ · 1999</text>
    </svg>`
  },

  /* ── 2 · LA CRÊTE ──────────────────────────────────────── */
  crete: {
    nom: "La Crête",
    desc: "Monogramme — le C devient le crocodile",
    ratio: 1.9,
    svg: `<svg viewBox="0 0 340 130" xmlns="http://www.w3.org/2000/svg" aria-label="Croc Parc">
      <g transform="translate(4,20)" fill="currentColor">
        <path d="M104 26 C92 10 70 3 50 7 C24 13 8 33 8 55 C8 77 24 97 50 103
                 C70 107 92 100 104 84 L104 62 C93 78 76 85 60 82 C42 78 32 68 32 55
                 C32 42 42 31 60 27 C76 24 93 31 104 47 Z"/>
        <path d="M40 12 L46 -2 L54 11 L62 -3 L70 12 L79 -1 L88 15 L97 4 L106 21
                 L100 26 L92 14 L84 24 L76 12 L68 22 L60 11 L52 21 L44 12 Z"/>
        <path d="M104 47 L150 42 L166 52 L150 60 L104 62 Z"/>
        <path d="M104 62 L150 60 L166 52 L158 68 L140 72 L104 74 Z"/>
      </g>
      <path d="M112 75 L156 71 L150 80 L140 73 L130 81 L120 74 Z" fill="var(--logo-neg,#fff)"/>
      <circle cx="90" cy="56" r="6" fill="var(--logo-neg,#fff)"/>
      <text x="192" y="60" font-family="var(--logo-ft,sans-serif)" font-size="35"
            font-weight="800" letter-spacing="-1.4" fill="currentColor">CROC</text>
      <text x="192" y="98" font-family="var(--logo-ft,sans-serif)" font-size="35"
            font-weight="400" letter-spacing="-1.4" fill="currentColor" opacity=".78">PARC</text>
    </svg>`
  },

  /* ── 3 · LE SOURIRE ────────────────────────────────────── */
  sourire: {
    nom: "Le Sourire",
    desc: "Chaleureux — parle aux enfants et aux anniversaires",
    ratio: 2.05,
    svg: `<svg viewBox="0 0 320 150" xmlns="http://www.w3.org/2000/svg" aria-label="Croc Parc">
      <g transform="translate(6,26)" fill="currentColor">
        <path d="M6 40 C6 26 18 16 36 14 L92 8 C118 5 142 12 156 26 L172 42 L146 46
                 C132 48 116 48 100 46 L44 54 C22 56 6 52 6 40 Z"/>
        <path d="M14 58 C30 62 56 62 86 58 L146 50 L172 46 L152 60 C138 70 116 76 92 78
                 L44 82 C24 82 12 74 14 58 Z"/>
        <path d="M44 14 L50 2 L58 13 L66 1 L74 12 L82 0 L90 11" stroke="currentColor"
              stroke-width="7" fill="none" stroke-linejoin="round"/>
      </g>
      <path d="M20 84 L178 72 L166 80 L152 73 L136 82 L120 76 L104 84 L88 78 L72 86
               L56 80 L40 88 L26 82 Z" fill="var(--logo-neg,#fff)"/>
      <circle cx="52" cy="58" r="11" fill="var(--logo-neg,#fff)"/>
      <circle cx="55" cy="59" r="4.6" fill="currentColor"/>
      <ellipse cx="166" cy="59" rx="5" ry="3.4" fill="var(--logo-neg,#fff)"/>
      <text x="200" y="68" font-family="var(--logo-ft,sans-serif)" font-size="31"
            font-weight="800" letter-spacing="-1.3" fill="currentColor">CROC</text>
      <text x="200" y="102" font-family="var(--logo-ft,sans-serif)" font-size="31"
            font-weight="500" letter-spacing="-1.3" fill="currentColor" opacity=".78">PARC</text>
    </svg>`
  },

  /* ── 4 · L'ŒIL ─────────────────────────────────────────── */
  oeil: {
    nom: "L'Œil",
    desc: "Graphique et prestige — impose le respect",
    ratio: 2.0,
    svg: `<svg viewBox="0 0 300 150" xmlns="http://www.w3.org/2000/svg" aria-label="Croc Parc">
      <g transform="translate(8,22)">
        <rect x="0" y="0" width="106" height="106" fill="currentColor"/>
        <path d="M8 52 C22 34 40 26 56 26 C74 26 92 36 100 52 C92 68 74 78 56 78
                 C40 78 22 70 8 52 Z" fill="var(--logo-neg,#fff)"/>
        <path d="M54 28 C62 38 62 66 54 76 C46 66 46 38 54 28 Z" fill="currentColor"/>
        <g stroke="currentColor" stroke-width="2.6" fill="none" opacity=".5">
          <path d="M16 44 L26 40 M32 36 L42 33 M70 34 L80 38 M86 42 L96 47"/>
          <path d="M18 62 L28 66 M34 70 L44 73 M70 72 L80 68 M86 64 L96 60"/>
        </g>
      </g>
      <text x="134" y="66" font-family="var(--logo-ft,serif)" font-size="38"
            font-weight="600" letter-spacing="1" fill="currentColor">CROC</text>
      <text x="134" y="104" font-family="var(--logo-ft,serif)" font-size="38"
            font-weight="400" letter-spacing="8" fill="currentColor" opacity=".78">PARC</text>
      <line x1="135" y1="116" x2="286" y2="116" stroke="currentColor" stroke-width="1" opacity=".55"/>
    </svg>`
  },

  /* ── 5 · LA LIGNE D'EAU ────────────────────────────────── */
  ligne: {
    nom: "La Ligne d'eau",
    desc: "Élégant — la ligne se réutilise partout",
    ratio: 2.15,
    svg: `<svg viewBox="0 0 330 150" xmlns="http://www.w3.org/2000/svg" aria-label="Croc Parc">
      <g transform="translate(6,22)" fill="currentColor">
        <path d="M2 50 C22 44 48 40 78 40 C104 40 126 43 142 48 L162 44 L166 52 L142 56
                 C126 61 104 64 78 64 C48 64 22 58 2 50 Z"/>
        <path d="M52 40 L58 26 L66 39 M74 39 L82 24 L90 39 M98 41 L106 28 L113 42"/>
        <rect x="0" y="66" width="176" height="3.4"/>
        <g opacity=".34">
          <path d="M8 74 C28 80 50 84 78 84 C104 84 126 80 142 75 L160 78
                   C140 88 110 94 78 94 C48 94 24 86 8 74 Z"/>
        </g>
      </g>
      <circle cx="156" cy="71" r="3.4" fill="var(--logo-neg,#fff)"/>
      <text x="196" y="72" font-family="var(--logo-ft,sans-serif)" font-size="28"
            font-weight="800" letter-spacing="-1" fill="currentColor">CROC</text>
      <text x="196" y="104" font-family="var(--logo-ft,sans-serif)" font-size="28"
            font-weight="800" letter-spacing="-1" fill="currentColor">PARC</text>
      <text x="6" y="140" font-family="var(--logo-fb,sans-serif)" font-size="10"
            letter-spacing="3.6" fill="currentColor" opacity=".62">NATURE &amp; LOISIRS · LA RÉUNION</text>
    </svg>`
  },

  /* ── 6 · LE CACHET ─────────────────────────────────────── */
  cachet: {
    nom: "Le Cachet",
    desc: "Tampon — ancrage local, excellent en merchandising",
    ratio: 1.55,
    svg: `<svg viewBox="0 0 250 162" xmlns="http://www.w3.org/2000/svg" aria-label="Croc Parc">
      <rect x="8" y="10" width="136" height="136" fill="currentColor"/>
      <rect x="16" y="18" width="120" height="120" fill="none"
            stroke="var(--logo-neg,#fff)" stroke-width="1.5"/>
      <g transform="translate(24,52) scale(.56)" fill="var(--logo-neg,#fff)">
        <path d="M14 52 C14 40 24 32 40 30 L96 24 C118 22 136 28 148 40 L164 52 L146 56
                 C130 60 110 62 92 60 L44 66 C26 66 14 62 14 52 Z"/>
        <path d="M20 64 C36 70 60 72 88 68 L146 58 L164 54 L146 70 C128 80 100 84 74 84
                 L38 82 C24 80 18 72 20 64 Z"/>
        <path d="M46 30 L52 18 L60 29 L68 17 L76 28 L84 16 L92 27" stroke="var(--logo-neg,#fff)"
              stroke-width="7" fill="none" stroke-linejoin="round"/>
      </g>
      <circle cx="52" cy="80" r="4.6" fill="currentColor"/>
      <text x="76" y="40" text-anchor="middle" font-family="var(--logo-ft,serif)"
            font-size="14" font-weight="700" fill="var(--logo-neg,#fff)" letter-spacing="1.6">CROC PARC</text>
      <text x="76" y="128" text-anchor="middle" font-family="var(--logo-fb,sans-serif)"
            font-size="8.5" letter-spacing="2.4" fill="var(--logo-neg,#fff)" opacity=".85">ÉTANG-SALÉ · 1999</text>
      <text x="162" y="70" font-family="var(--logo-ft,serif)" font-size="24"
            font-weight="700" fill="currentColor">CROC</text>
      <text x="162" y="100" font-family="var(--logo-ft,serif)" font-size="24"
            font-weight="400" fill="currentColor" opacity=".78">PARC</text>
    </svg>`
  }
};

/* Logo conseillé par défaut pour chaque univers */
const CP_LOGO_DEFAUT = { a: "officiel", b: "officiel", c: "officiel" };

/* Pourquoi ce logo va bien avec cet univers */
const CP_LOGO_ACCORD = {
  a: { officiel: "le logo retenu", officielTropical: "variante plus riche", oeil: "sobre, très premium", cachet: "sobre en or sur noir", crete: "épuré, tient bien" },
  b: { officiel: "le logo retenu", officielTropical: "variante plus riche", ecusson: "l'esprit blason", cachet: "l'esprit tampon créole", sourire: "chaleureux, ça marche" },
  c: { officiel: "le logo retenu", officielTropical: "variante plus riche", ligne: "net et moderne", crete: "net et lisible partout", sourire: "familial, ça marche" }
};
