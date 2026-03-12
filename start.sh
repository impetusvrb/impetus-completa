#!/bin/bash
# IMPETUS COMUNICA IA - Script de subida
# Conecta e inicia backend + frontend

set -e
cd "$(dirname "$0")"

echo "══════════════════════════════════════════════"
echo "  IMPETUS COMUNICA IA - Iniciando"
echo "══════════════════════════════════════════════"

# 1. Verificar .env
if [ ! -f .env ]; then
  echo "⚠ .env não encontrado. Copiando de .env.example..."
  cp .env.example .env 2>/dev/null || true
  echo "▶ Edite .env com suas credenciais (DB, OPENAI_API_KEY)"
fi

# 2. Migrations
echo ""
echo "[1/3] Executando migrations..."
cd backend && npm run migrate 2>/dev/null || true
cd ..

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
