# Configuration — Firecrawl & Higgsfield pour Claude

## Ce qui est installé dans ce dépôt

- **`.mcp.json`** — deux serveurs MCP chargés automatiquement dans les
  sessions Claude Code :
  - `firecrawl` : serveur officiel `firecrawl-mcp` (scraping, recherche,
    crawl, extraction). Clé lue depuis la variable `FIRECRAWL_API_KEY`.
  - `higgsfield` : serveur MCP hébergé `https://mcp.higgsfield.ai/mcp`
    (génération d'images et vidéos IA — Veo, Kling, Soul, Flux, etc.).
- **`.claude/skills/firecrawl*`** — 31 skills Firecrawl (recherche, scrape,
  crawl, monitoring, SEO, lead gen, design clone, deep research…).
- **`.claude/settings.json`** — hook de démarrage de session qui réinstalle
  le CLI `firecrawl` et le connecte avec `FIRECRAWL_API_KEY` si présente.

## ⚠️ À faire pour que ça fonctionne (réglages côté claude.ai)

### 1. Autoriser les domaines dans la politique réseau de l'environnement

La politique réseau actuelle de l'environnement Claude Code **bloque** les
appels sortants vers Firecrawl et Higgsfield (erreur 403 du proxy).

Dans claude.ai → **Claude Code → Paramètres de l'environnement → Accès
réseau**, ajoutez ces domaines à la liste autorisée (ou passez en accès
« tous les domaines ») :

- `api.firecrawl.dev`
- `www.firecrawl.dev`
- `mcp.firecrawl.dev`
- `mcp.higgsfield.ai`
- `higgsfield.ai`

### 2. Ajouter la clé API Firecrawl en variable d'environnement

Toujours dans les paramètres de l'environnement → **Variables
d'environnement**, ajoutez :

```
FIRECRAWL_API_KEY=fc-...   (votre clé, visible sur https://www.firecrawl.dev/app/api-keys)
```

### 3. Authentifier Higgsfield (OAuth)

Higgsfield n'utilise pas de clé API : à la première utilisation dans une
session interactive, lancez `/mcp` dans Claude Code et suivez
l'authentification navigateur (compte Higgsfield, 150 crédits
gratuits/mois).

## Utilisation avec claude.ai / Claude Design

Pour avoir ces outils aussi dans l'interface claude.ai (chat, design),
ajoutez-les comme connecteurs : **Paramètres → Connecteurs → Ajouter un
connecteur personnalisé** :

- Higgsfield : `https://mcp.higgsfield.ai/mcp`
- Firecrawl (endpoint hébergé, remplacez par votre clé) :
  `https://mcp.firecrawl.dev/fc-VOTRE-CLE/v2/mcp`

## Note pour les sessions Claude Code (proxy sortant)

Le SDK `firecrawl` embarqué dans le CLI utilise axios < 1.16.1, qui gère mal
le proxy HTTPS de l'environnement (erreur 405). Correctif appliqué en
session : `npm install axios@^1.16.1` dans
`$(npm root -g)/firecrawl-cli/node_modules/firecrawl`. À refaire si le CLI
renvoie une erreur 405 (les versions récentes du CLI corrigeront cela).
