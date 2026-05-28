#!/usr/bin/env bash
# PROMPT 28 — Promoção controlada shadow → audit → on (sem restart agressivo)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT/.env"
VERIFY="node $ROOT/scripts/runtime-unification-promotion-verify.js"
TESTS="node $ROOT/src/tests/waveRuntimeUnificationScenarios.js"

set_mode() {
  local mode="$1"
  if grep -q '^IMPETUS_RUNTIME_UNIFICATION_MODE=' "$ENV_FILE"; then
    sed -i "s/^IMPETUS_RUNTIME_UNIFICATION_MODE=.*/IMPETUS_RUNTIME_UNIFICATION_MODE=${mode}/" "$ENV_FILE"
  fi
  echo "[PROMO] MODE=${mode}"
  pm2 reload impetus-backend --update-env
  sleep 12
}

echo "=== PROMPT 28 promotion pipeline ==="

echo "--- Step 1: shadow verify (baseline) ---"
set_mode shadow
$VERIFY || exit 1

echo "--- Step 2: audit + validate inserts ---"
set_mode audit
$VERIFY || exit 1
$TESTS || exit 1

echo "--- Step 3: on (operational) ---"
set_mode on
$VERIFY || exit 1
$TESTS || exit 1

echo "=== PROMOTION COMPLETE: IMPETUS_RUNTIME_UNIFICATION_MODE=on ==="
grep '^IMPETUS_RUNTIME_UNIFICATION_MODE=' "$ENV_FILE"
pm2 logs impetus-backend --lines 40 --nostream 2>&1 | grep RUNTIME_UNIFICATION_BOOT | tail -1 || true
