#!/usr/bin/env bash
# Smoke test Docker Enterprise — CERT-ONPREM-CONTAINER-01
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

# shellcheck source=/dev/null
source docker/scripts/prepare-smoke-env.sh

COMPOSE="docker compose --env-file .env.docker-smoke"
PORT="${IMPETUS_HTTP_PORT:-8088}"
FAILED=0
PASSED=0

pass() { PASSED=$((PASSED + 1)); echo "  OK  $1"; }
fail() { FAILED=$((FAILED + 1)); echo "  FAIL $1"; }

echo "=== IMPETUS Container Smoke ==="
echo "IMPETUS_HOME=$IMPETUS_HOME PORT=$PORT"

echo "[1] docker compose build..."
$COMPOSE build --quiet 2>&1 | tail -5

echo "[2] docker compose up..."
$COMPOSE down -v --remove-orphans 2>/dev/null || true
$COMPOSE up -d

echo "[3] aguardar serviços..."
for i in $(seq 1 120); do
  if curl -sf "http://127.0.0.1:${PORT}/health" >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

echo "[4] validações..."
if curl -sf "http://127.0.0.1:${PORT}/health" | grep -q ok; then
  pass "nginx → backend /health"
else
  fail "nginx → backend /health"
fi

if curl -sf "http://127.0.0.1:${PORT}/" -o /dev/null; then
  pass "nginx → frontend SPA"
else
  fail "nginx → frontend SPA"
fi

if curl -sf "http://127.0.0.1:${PORT}/api/health" | grep -q ok; then
  pass "nginx → backend /api/health"
else
  fail "nginx → backend /api/health"
fi

CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:${PORT}/api/impetus-admin")
if [[ "$CODE" == "403" ]]; then
  pass "bloqueio Enterprise /api/impetus-admin"
else
  fail "bloqueio Enterprise /api/impetus-admin (got $CODE)"
fi

if $COMPOSE exec -T postgres pg_isready -U impetus_app -d impetus_db >/dev/null 2>&1; then
  pass "PostgreSQL conectável"
else
  fail "PostgreSQL conectável"
fi

if $COMPOSE exec -T backend node scripts/enterprise/license-admin.js status >/dev/null 2>&1; then
  pass "licença CLI no container"
else
  fail "licença CLI no container"
fi

if $COMPOSE exec -T backend pm2 list 2>/dev/null | grep -q impetus-backend; then
  pass "PM2 Runtime backend (impetus-backend online)"
else
  fail "PM2 Runtime backend (impetus-backend online)"
fi

if $COMPOSE exec -T frontend pm2 list 2>/dev/null | grep -q impetus-frontend; then
  pass "PM2 Runtime frontend (impetus-frontend online)"
else
  fail "PM2 Runtime frontend (impetus-frontend online)"
fi

if [[ -d "$IMPETUS_HOME/uploads" && -d "$IMPETUS_HOME/data" ]]; then
  pass "volumes IMPETUS_HOME persistidos"
else
  fail "volumes IMPETUS_HOME persistidos"
fi

echo ""
echo "Resultado: $PASSED OK, $FAILED FAIL"

if [[ "$FAILED" -gt 0 ]]; then
  echo "--- logs backend (tail) ---"
  $COMPOSE logs backend --tail 40
  exit 1
fi

if [[ "${SMOKE_KEEP_RUNNING:-false}" != "true" ]]; then
  $COMPOSE down
  echo "Stack parada (SMOKE_KEEP_RUNNING=true para manter)"
fi

exit 0
