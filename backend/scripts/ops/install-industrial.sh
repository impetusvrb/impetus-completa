#!/usr/bin/env bash
# IMPETUS — Instalação industrial (tenant limpo)
# Uso: sudo bash backend/scripts/ops/install-industrial.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
BACKEND="$ROOT/backend"
FRONTEND="$ROOT/frontend"

echo "=== IMPETUS Instalação Industrial ==="
echo "Raiz: $ROOT"

# 1. Dependências
echo "[1/8] npm install backend..."
(cd "$BACKEND" && npm ci --omit=dev 2>/dev/null || npm install --omit=dev)

echo "[2/8] npm install + build frontend..."
(cd "$FRONTEND" && npm ci 2>/dev/null || npm install)
(cd "$FRONTEND" && npm run build)

# 2. Variáveis obrigatórias (instalação limpa)
ENV_FILE="$BACKEND/.env"
if [[ -f "$ENV_FILE" ]]; then
  grep -q 'IMPETUS_COGNITIVE_LIVING_ENRICHMENT' "$ENV_FILE" || echo 'IMPETUS_COGNITIVE_LIVING_ENRICHMENT=false' >> "$ENV_FILE"
  grep -q 'IMPETUS_INDUSTRIAL_LAB_ENABLED' "$ENV_FILE" || echo 'IMPETUS_INDUSTRIAL_LAB_ENABLED=false' >> "$ENV_FILE"
  sed -i 's/^IMPETUS_COGNITIVE_LIVING_ENRICHMENT=.*/IMPETUS_COGNITIVE_LIVING_ENRICHMENT=false/' "$ENV_FILE" 2>/dev/null || true
  sed -i 's/^IMPETUS_INDUSTRIAL_LAB_ENABLED=.*/IMPETUS_INDUSTRIAL_LAB_ENABLED=false/' "$ENV_FILE" 2>/dev/null || true
  sed -i 's/^IMPETUS_INDUSTRIAL_LAB_AUTO_E2E_ON_BOOT=.*/IMPETUS_INDUSTRIAL_LAB_AUTO_E2E_ON_BOOT=false/' "$ENV_FILE" 2>/dev/null || true
fi

# 3. Migrações BD
echo "[3/8] Migrações PostgreSQL..."
(cd "$BACKEND" && node -r dotenv/config scripts/run-all-migrations.js)

# 4. Nginx (se existir backup)
if [[ -L /etc/nginx/sites-enabled/impetus ]] && [[ ! -f /etc/nginx/sites-available/impetus ]]; then
  BAK=$(ls -1 /etc/nginx/sites-available/impetus.bak.* 2>/dev/null | head -1)
  if [[ -n "$BAK" ]]; then
    echo "[4/8] Restaurar nginx de $BAK"
    cp "$BAK" /etc/nginx/sites-available/impetus
    nginx -t && systemctl reload nginx
  fi
else
  echo "[4/8] Nginx — config existente OK"
  nginx -t 2>/dev/null && systemctl reload nginx 2>/dev/null || echo "  (nginx skip — sem permissão root)"
fi

# 5. PM2 — backend + frontend (sem lab em produção)
echo "[5/8] PM2 restart produção..."
pm2 stop impetus-lab-modbus impetus-lab-opcua impetus-lab-oidc impetus-lab-smtp impetus-edge-agent-lab 2>/dev/null || true
(cd "$BACKEND" && pm2 restart impetus-backend --update-env)
(cd "$FRONTEND" && pm2 restart impetus-frontend --update-env)

# 6. Testes smoke
echo "[6/8] Testes governança..."
(cd "$BACKEND" && npm run test:contextual-modules)
(cd "$BACKEND" && npm run test:domain-isolation)

# 7. Health
echo "[7/8] Health check..."
sleep 3
HTTP=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4000/health || echo 000)
FE=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3000/ || echo 000)
echo "  backend /health: $HTTP"
echo "  frontend /: $FE"

# 8. Smoke instalação limpa
echo "[8/8] Smoke instalação..."
node "$BACKEND/scripts/ops/smoke-clean-install.js" || echo "  AVISO: smoke-clean-install falhou — verificar manualmente"

echo ""
echo "=== Instalação concluída ==="
echo "Próximos passos para o cliente:"
echo "  1. Aceder à URL pública → Login"
echo "  2. Setup empresa (/setup-empresa) se primeiro acesso"
echo "  3. Admin → Base Estrutural (/app/admin/structural) — cargos, departamentos, setores"
echo "  4. Cadastrar utilizadores com company_role_id"
echo "  5. Validar menu e dashboard por cargo"
echo ""
echo "Documentação: backend/docs/INSTALACAO_INDUSTRIAL.md"
