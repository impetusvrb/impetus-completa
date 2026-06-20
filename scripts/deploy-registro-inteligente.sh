#!/usr/bin/env bash
# Deploy: Registro Inteligente (anexos + renomeação do botão)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
echo "==> IMPETUS deploy Registro Inteligente"
echo "    Raiz: $ROOT"

mkdir -p "$ROOT/uploads/registro-inteligente"

echo "==> Build frontend..."
cd "$ROOT/frontend"
npm run build

echo "==> Restart PM2..."
if command -v pm2 >/dev/null 2>&1; then
  pm2 restart impetus-frontend || pm2 restart all
  pm2 restart impetus-backend || true
  pm2 list
else
  echo "AVISO: pm2 não encontrado. Reinicie frontend/backend manualmente."
fi

echo ""
echo "OK. Abra: http://SEU_IP:3000/app/registro-inteligente"
echo "     Ctrl+F5 para limpar cache."
echo "Deve aparecer em /app/registro-inteligente e no Chat Impetus (botão Registro):"
echo "  - Botões: Arquivo | Tirar foto | Gravar áudio"
echo "  - Botão principal: Registro Inteligente"
