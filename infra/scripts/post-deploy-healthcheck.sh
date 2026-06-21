#!/usr/bin/env bash
# Post-deploy health check — validar que o IMPETUS está operacional após deploy.
# Uso: bash infra/scripts/post-deploy-healthcheck.sh [host] [timeout_secs]

set -euo pipefail

HOST="${1:-http://127.0.0.1:4000}"
TIMEOUT="${2:-30}"
CHECKS_OK=0
CHECKS_FAIL=0

check() {
  local name="$1" url="$2" expected="$3"
  local status body
  status=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "$url" 2>/dev/null || echo "000")
  if [[ "$status" == "$expected" ]]; then
    echo "  [OK]   $name (HTTP $status)"
    ((CHECKS_OK++))
  else
    echo "  [FAIL] $name (HTTP $status, esperado $expected)"
    ((CHECKS_FAIL++))
  fi
}

echo "=== IMPETUS Post-Deploy Health Check ==="
echo "Host: $HOST"
echo "---"

echo ""
echo "[Backend]"
check "Health endpoint"           "$HOST/health"                    "200"
check "API health"                "$HOST/api/health"                "200"
check "Auth (sem token = 401)"    "$HOST/api/dashboard/kpis"        "401"
check "TTS (sem token = 401)"     "$HOST/api/tts"                   "401"

echo ""
echo "[Frontend]"
FHOST="${FRONTEND_HOST:-http://127.0.0.1:3000}"
check "SPA index"                 "$FHOST/"                         "200"

echo ""
echo "=== Resultado: $CHECKS_OK OK / $CHECKS_FAIL FAIL ==="

if [[ $CHECKS_FAIL -gt 0 ]]; then
  echo "[ALERTA] Deploy com falhas. Verifique logs: pm2 logs"
  exit 1
fi

echo "[SUCESSO] Deploy validado."
exit 0
