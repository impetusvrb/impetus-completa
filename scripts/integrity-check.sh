#!/usr/bin/env bash
# HARDENING-01 — Validação periódica de integridade (sem correção automática)
# Uso: scripts/integrity-check.sh [--baseline] [--report /path/report.json]
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BASELINE="${ROOT}/backend/docs/integrity/HARDENING-01-baseline.sha256"
REPORT="${ROOT}/backend/docs/integrity/HARDENING-01-last-report.json"
MODE="check"
TIMESTAMP="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --baseline) MODE="baseline"; shift ;;
    --report) REPORT="$2"; shift 2 ;;
    *) echo "Uso: $0 [--baseline] [--report path]" >&2; exit 1 ;;
  esac
done

mkdir -p "$(dirname "$BASELINE")" "$(dirname "$REPORT")"

# Ficheiros críticos (código runtime, config PM2, nginx repo, docs enterprise)
MANIFEST="$(mktemp)"
cat > "$MANIFEST" <<EOF
backend/src/server.js
ecosystem.config.js
frontend/vite.config.js
frontend/serveDist.cjs
infra/nginx/impetus-production.conf
infra/nginx/impetus-hardening-locations.conf
scripts/deploy-impetus.sh
scripts/deploy-nginx-hardening.sh
scripts/integrity-check.sh
.github/workflows/cert-drift.yml
backend/docs/IMPETUS_COGNITIVE_EXPERIENCE_BLUEPRINT/Volume-00-CARTA-MAGNA.md
backend/docs/IMPETUS_COGNITIVE_EXPERIENCE_BLUEPRINT/Volume-10-ROADMAP-ENTERPRISE.md
backend/docs/FUNCTIONAL_MATRIX.json
backend/scripts/audit/e2e_cert_all.js
backend/scripts/run-all-migrations.js
EOF

CURRENT="$(mktemp)"
MISSING=()
while IFS= read -r rel; do
  [[ -z "$rel" || "$rel" =~ ^# ]] && continue
  fp="$ROOT/$rel"
  if [[ ! -f "$fp" ]]; then
    MISSING+=("$rel")
    continue
  fi
  sha256sum "$fp" | awk -v p="$rel" '{print $1 "  " p}' >> "$CURRENT"
done < "$MANIFEST"

if [[ "$MODE" == "baseline" ]]; then
  cp "$CURRENT" "$BASELINE"
  echo "Baseline gravada: $BASELINE ($(wc -l < "$BASELINE") entradas)"
  rm -f "$MANIFEST" "$CURRENT"
  exit 0
fi

STATUS="ok"
DRIFT=()
if [[ ! -f "$BASELINE" ]]; then
  STATUS="no_baseline"
else
  while IFS= read -r line; do
    hash="${line%%  *}"
    path="${line#*  }"
    if ! grep -qF "$line" "$BASELINE" 2>/dev/null; then
      old="$(grep -F "  $path" "$BASELINE" 2>/dev/null | head -1 || true)"
      DRIFT+=("$path")
    fi
  done < "$CURRENT"
  [[ ${#DRIFT[@]} -gt 0 ]] && STATUS="drift"
fi

[[ ${#MISSING[@]} -gt 0 ]] && STATUS="missing_files"

python3 - <<PY
import json, os
report = {
  "timestamp": "$TIMESTAMP",
  "status": "$STATUS",
  "missing_files": $(printf '%s\n' "${MISSING[@]:-}" | python3 -c 'import sys,json; print(json.dumps([l for l in sys.stdin.read().splitlines() if l]))'),
  "drift_files": $(printf '%s\n' "${DRIFT[@]:-}" | python3 -c 'import sys,json; print(json.dumps([l for l in sys.stdin.read().splitlines() if l]))'),
  "checked_count": $(wc -l < "$CURRENT" | tr -d ' '),
  "baseline": "$BASELINE",
}
with open("$REPORT", "w") as f:
    json.dump(report, f, indent=2)
print(json.dumps(report, indent=2))
PY

rm -f "$MANIFEST" "$CURRENT"

case "$STATUS" in
  ok) exit 0 ;;
  no_baseline) echo "AVISO: execute $0 --baseline primeiro" >&2; exit 2 ;;
  *) exit 1 ;;
esac
