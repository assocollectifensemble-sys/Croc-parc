# Configuration MCP — Firecrawl & Higgsfield

Ce dépôt est configuré (via `.mcp.json`) pour charger deux serveurs MCP dans
les sessions Claude Code :

## 🔥 Firecrawl (scraping / recherche web)

- Serveur : `npx -y firecrawl-mcp` (paquet officiel)
- **Nécessite une clé API** : créez un compte sur https://www.firecrawl.dev
  puis récupérez votre clé sur https://www.firecrawl.dev/app/api-keys
- Définissez la variable d'environnement `FIRECRAWL_API_KEY` :
  - **Claude Code sur le web** : Paramètres de l'environnement → Variables
    d'environnement → ajouter `FIRECRAWL_API_KEY` = `fc-...`
  - **En local** : `export FIRECRAWL_API_KEY=fc-...` avant de lancer `claude`

## 🎬 Higgsfield (génération d'images & vidéos IA)

- Serveur MCP hébergé : `https://mcp.higgsfield.ai/mcp`
- **Pas de clé API** : à la première utilisation, une authentification OAuth
  vous connecte à votre compte Higgsfield (150 crédits gratuits / mois).
- Dans Claude Code, lancez `/mcp` pour vous authentifier si nécessaire.

## Utilisation avec Claude (claude.ai / Claude Design)

Pour utiliser ces outils côté claude.ai (chat, design), ajoutez-les comme
connecteurs : **Paramètres → Connecteurs → Ajouter un connecteur personnalisé** :

- Higgsfield : `https://mcp.higgsfield.ai/mcp`
- Firecrawl (endpoint hébergé, remplacez par votre clé) :
  `https://mcp.firecrawl.dev/fc-VOTRE-CLE/v2/mcp`
