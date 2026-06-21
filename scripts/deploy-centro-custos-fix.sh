#!/usr/bin/env bash
# Corrige 404 do Centro de Custos — rotas /api/dashboard/costs/*
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
echo "==> IMPETUS: deploy fix Centro de Custos"

if [ -f "$ROOT/backend/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT/backend/.env" 2>/dev/null || true
  set +a
fi

DB_URL="${DATABASE_URL:-${POSTGRES_URL:-}}"
if [ -n "$DB_URL" ] && command -v psql >/dev/null 2>&1; then
  echo "==> Aplicando migration industrial_cost_center (se necessário)..."
  psql "$DB_URL" -v ON_ERROR_STOP=1 -f "$ROOT/backend/src/models/industrial_cost_center_migration.sql" || {
    echo "AVISO: migration falhou ou já aplicada — verifique manualmente."
  }
else
  echo "AVISO: DATABASE_URL/psql indisponível — pule migration ou rode manualmente:"
  echo "  psql \$DATABASE_URL -f backend/src/models/industrial_cost_center_migration.sql"
fi

echo "==> Reiniciando backend..."
if command -v pm2 >/dev/null 2>&1; then
  pm2 restart impetus-backend
  pm2 list | head -8
else
  echo "AVISO: pm2 não encontrado."
fi

echo ""
echo "OK. Teste: GET /api/dashboard/costs/items (com token admin)"
echo "Página: http://SEU_IP:3000/app/admin/centro-custos"
