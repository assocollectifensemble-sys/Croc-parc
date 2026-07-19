# WhatsApp AgentKit — Croc-parc

Agent IA WhatsApp pour Croc-parc, permettant à Claude de répondre aux messages
WhatsApp (FAQ, réservations, commandes, support). Adapté de
[Hainrixz/whatsapp-agentkit](https://github.com/Hainrixz/whatsapp-agentkit).

## Démarrage

```bash
cd whatsapp-agent
bash start.sh
claude
```
Puis, dans Claude Code, utilise le skill `build-agent` pour lancer l'entretien
métier et générer l'agent complet.

## Prérequis

- Python 3.11+
- Node.js + Claude Code (`npm install -g @anthropic-ai/claude-code`)
- Une clé API Anthropic (https://platform.anthropic.com/settings/api-keys)
- Un compte WhatsApp Business via Meta Cloud API, ou un compte Twilio

## Structure (générée par le skill `build-agent`)

```
agent/
├── main.py          # Serveur FastAPI + webhook
├── brain.py         # Intégration Claude
├── memory.py        # Historique de conversation (SQLite)
├── tools.py         # Fonctions métier Croc-parc
└── providers/        # Adaptateur Meta ou Twilio (un seul des deux)
config/
├── business.yaml
└── prompts.yaml
knowledge/            # Fichiers métier (menu, tarifs, FAQ...)
tests/
└── test_local.py
```

## Sécurité

- `.env` n'est jamais commité (voir `.gitignore`).
- Aucune clé API en dur dans le code généré.
