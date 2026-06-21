#!/usr/bin/env bash
# IMPETUS CERT — gate anti-drift (Parte 9). Falha se matriz/inventário divergir do código.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG="${IMPETUS_CERT_DRIFT_LOG:-/var/log/impetus-cert-drift.log}"
mkdir -p "$(dirname "$LOG")"
{
  echo "=== $(date -Is) cert-drift-gate ==="
  cd "$ROOT/backend"
  npm run cert:drift
} >>"$LOG" 2>&1
echo "[cert-drift] OK — ver $LOG"
