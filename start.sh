#!/bin/bash
# IMPETUS COMUNICA IA - Script de subida (DEV-FOCUSED)
# Conecta e inicia backend + frontend.
# Enterprise Hardening Bloco 4 (C11 / B1):
#   • set -euo pipefail garante fail-fast em qualquer comando ou pipe falhado.
#   • `npm run migrate` deixa de ser silenciado: erros são visíveis e abortam o
#     script (preserva o invariante schema-alinhado antes de subir o backend).
#   • Mantido como script DE DESENVOLVIMENTO. Para produção usar PM2 + deploy
#     pipeline (ver documentação interna; este ficheiro não substitui ecosystem).

set -euo pipefail
cd "$(dirname "$0")"

echo "══════════════════════════════════════════════"
echo "  IMPETUS COMUNICA IA - Iniciando (dev)"
echo "══════════════════════════════════════════════"

# 1. Verificar .env
if [ ! -f .env ]; then
  echo "⚠ .env não encontrado. Copiando de .env.example..."
  if [ -f .env.example ]; then
    cp .env.example .env
  else
    echo "✗ .env.example também ausente — abortando."
    exit 1
  fi
  echo "▶ Edite .env com suas credenciais (DB, OPENAI_API_KEY)"
fi

# 2. Migrations (fail-fast — não usar '|| true', não redireccionar stderr)
echo ""
echo "[1/3] Executando migrations..."
(
  cd backend
  npm run migrate
)

# 3. Backend
echo ""
echo "[2/3] Iniciando backend (porta 4000)..."
cd backend
if lsof -i:4000 >/dev/null 2>&1; then
  echo "    Backend já está rodando em :4000"
else
  npm run dev &
  sleep 3
fi
cd ..

# 4. Frontend
echo ""
echo "[3/3] Iniciando frontend (porta 5173)..."
cd frontend
if lsof -i:5173 >/dev/null 2>&1; then
  echo "    Frontend já está rodando em :5173"
else
  npm run dev &
  sleep 2
fi
cd ..

echo ""
echo "══════════════════════════════════════════════"
echo "  ✓ Pronto!"
echo "  Backend:  http://localhost:4000"
echo "  Frontend: http://localhost:5173"
echo "  Health:   http://localhost:4000/health"
echo "══════════════════════════════════════════════"
