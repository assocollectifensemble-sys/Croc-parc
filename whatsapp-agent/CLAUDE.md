# WhatsApp AgentKit — Croc-parc

Ce dossier contient l'agent IA WhatsApp de Croc-parc, adapté de
[Hainrixz/whatsapp-agentkit](https://github.com/Hainrixz/whatsapp-agentkit).

## Fonctionnement

Un webhook reçoit les messages WhatsApp (via Meta Cloud API ou Twilio), les
normalise, récupère l'historique de conversation (SQLite), envoie le contexte
à Claude pour générer une réponse, puis renvoie la réponse sur WhatsApp.

## Pour (re)générer l'agent

Utiliser le skill `build-agent` (`whatsapp-agent/.claude/skills/build-agent/SKILL.md`).
Il mène l'entretien métier puis génère tout le code sous ce dossier.

## Règles

- Ne jamais committer `.env` (voir `.gitignore`).
- Ne jamais coder en dur une clé API dans le code généré.
- Un seul adaptateur fournisseur généré (celui choisi lors de l'entretien).
