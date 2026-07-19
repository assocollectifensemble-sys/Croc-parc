#!/usr/bin/env bash
set -e

echo "== WhatsApp AgentKit (Croc-parc) — vérification de l'environnement =="

# 1. Python 3.11+
if ! command -v python3 >/dev/null 2>&1; then
  echo "Python 3.11+ est requis. Installe-le depuis https://www.python.org/downloads/"
  exit 1
fi

PY_VERSION=$(python3 -c 'import sys; print("%d.%d" % sys.version_info[:2])')
PY_MAJOR=$(echo "$PY_VERSION" | cut -d. -f1)
PY_MINOR=$(echo "$PY_VERSION" | cut -d. -f2)
if [ "$PY_MAJOR" -lt 3 ] || { [ "$PY_MAJOR" -eq 3 ] && [ "$PY_MINOR" -lt 11 ]; }; then
  echo "Python $PY_VERSION détecté, mais 3.11+ est requis."
  exit 1
fi
echo "Python $PY_VERSION OK"

# 2. Claude Code
if ! command -v claude >/dev/null 2>&1; then
  echo "Claude Code n'est pas installé. Installe-le avec :"
  echo "  npm install -g @anthropic-ai/claude-code"
  exit 1
fi
echo "Claude Code OK"

# 3. Dossiers
mkdir -p agent/providers config knowledge tests
echo "Dossiers prêts (agent/, config/, knowledge/, tests/)"

# 4. .env
if [ ! -f .env ]; then
  cp .env.example .env
  echo ".env créé depuis .env.example — complète-le avant de démarrer l'agent."
fi

echo ""
echo "Tout est prêt. Lance Claude Code puis exécute /build-agent"
echo "(ou utilise le skill whatsapp-agent:build-agent)."
