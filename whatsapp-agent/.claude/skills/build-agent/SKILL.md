---
name: build-agent
description: Construit un agent IA WhatsApp complet (adapté de Hainrixz/whatsapp-agentkit) pour gérer les conversations WhatsApp de Croc-parc via Claude. Utiliser quand l'utilisateur veut créer, reconfigurer ou régénérer l'agent WhatsApp.
---

# Build Agent — WhatsApp AgentKit (Croc-parc)

Adapté de https://github.com/Hainrixz/whatsapp-agentkit. Génère un agent WhatsApp
piloté par Claude, capable de répondre aux messages entrants (FAQ, réservations,
commandes, support) au nom de Croc-parc.

Toujours communiquer en français avec l'utilisateur pendant ce processus.
Poser les questions une par une (ou en petits groupes cohérents), ne jamais
avancer de phase sans confirmation explicite, et ne jamais coder en dur une
clé API — elles vont uniquement dans `whatsapp-agent/.env` (jamais commité).

## Phase 1 — Vérification de l'environnement

- Vérifier Python 3.11+ (`python3 --version`).
- Créer les dossiers `agent/`, `config/`, `knowledge/`, `tests/` sous `whatsapp-agent/`.
- Générer `requirements.txt` et installer les dépendances.
- Créer `.env` à partir de `.env.example` si absent.
- Confirmer que tout est prêt avant de continuer.

## Phase 2 — Entretien métier (10 questions)

1. Nom et description de l'activité (Croc-parc).
2. Cas d'usage principal : FAQ, réservations, prise de commande, support client, qualification de leads (plusieurs choix possibles).
3. Personnalité/ton de l'agent (chaleureux, formel, familier, etc.).
4. Horaires d'ouverture.
5. Langue(s) de réponse.
6. Fichiers de connaissance à utiliser (menu, tarifs, FAQ, règlement...) — chemins ou contenu.
7. Informations de contact humain en cas d'escalade.
8. Limites : ce que l'agent ne doit jamais faire/dire.
9. Choix du fournisseur WhatsApp : `meta` (Cloud API, production, compte Business vérifié requis) ou `twilio` (sandbox gratuit, plus simple pour démarrer).
10. Identifiants du fournisseur choisi + clé API Anthropic — demander à l'utilisateur de les coller directement dans `whatsapp-agent/.env`, jamais dans le chat.

## Phase 3 — Génération de l'agent

Générer sous `whatsapp-agent/` :
- `config/business.yaml`, `config/prompts.yaml` (system prompt personnalisé à partir de l'entretien)
- `agent/providers/base.py` + l'adaptateur du seul fournisseur choisi (`meta.py` ou `twilio.py`)
- `agent/main.py` (serveur FastAPI + webhook)
- `agent/brain.py` (appel à l'API Claude)
- `agent/memory.py` (historique de conversation SQLite via SQLAlchemy)
- `agent/tools.py` (fonctions métier spécifiques à Croc-parc)
- `tests/test_local.py`
- `Dockerfile`, `docker-compose.yml`

Code commenté, simple, sans clé API en dur.

## Phase 4 — Test local

Faire lancer `python tests/test_local.py` à l'utilisateur pour simuler des
conversations sans WhatsApp réel. Itérer avant de passer à la phase 5.

## Phase 5 — Déploiement (uniquement si l'utilisateur approuve explicitement)

Build Docker, push GitHub, déploiement Railway avec variables d'environnement
et configuration du webhook chez le fournisseur choisi. Ne jamais exécuter de
déploiement réel sans confirmation explicite de l'utilisateur à chaque étape.
