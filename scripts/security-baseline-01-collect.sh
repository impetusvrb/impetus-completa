#!/usr/bin/env bash
# SECURITY-BASELINE-01 — Colector read-only de evidências (re-executável)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
EV="$ROOT/backend/docs/evidence/security-baseline-01"
TS="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
mkdir -p "$EV"

cd "$ROOT"

{
  echo "{"
  echo "  \"certification\": \"SECURITY-BASELINE-01\","
  echo "  \"collected_at\": \"$TS\","
  echo "  \"git_head\": \"$(git rev-parse HEAD)\","
  echo "  \"git_head_date\": \"$(git log -1 --format=%ci)\","
  echo "  \"git_deleted_count\": $(git ls-files --deleted | wc -l | tr -d ' '),"
  echo "  \"hostname\": \"$(hostname)\","
  echo "  \"public_ip\": \"$(hostname -I | awk '{print $1}')\""
  echo "}"
} > "$EV/metrics.json"

grep "useRoute('" backend/src/server.js | sed "s/.*useRoute('\\([^']*\\)'.*/\\1/" | sort -u > "$EV/api-mount-paths.txt"

# critical + blueprint hashes (append-only refresh)
{
  echo "# Critical file hashes $TS"
  echo "# HEAD: $(git rev-parse HEAD)"
  for f in \
    backend/src/server.js ecosystem.config.js frontend/vite.config.js frontend/serveDist.cjs \
    infra/nginx/impetus-production.conf infra/nginx/impetus-hardening-locations.conf \
    scripts/deploy-nginx-hardening.sh scripts/integrity-check.sh \
    .github/workflows/cert-drift.yml backend/.env.example \
    backend/docs/FUNCTIONAL_MATRIX.json backend/src/config/security.js \
    backend/scripts/run-all-migrations.js
  do
    [ -f "$f" ] && stat --printf='%Y %s ' "$f" && sha256sum "$f"
  done
  for f in /etc/nginx/sites-available/impetus /etc/ssh/sshd_config.d/99-impetus-hardening.conf; do
    [ -f "$f" ] && stat --printf='%Y %s ' "$f" && sha256sum "$f"
  done
} > "$EV/critical-files.sha256.manifest"

find backend/docs/IMPETUS_COGNITIVE_EXPERIENCE_BLUEPRINT -type f -name '*.md' 2>/dev/null | sort | xargs sha256sum > "$EV/blueprint-volumes.sha256" 2>/dev/null || true

ss -tlnp > "$EV/listening-ports.snapshot.txt" 2>/dev/null || true
ufw status numbered > "$EV/ufw.snapshot.txt" 2>/dev/null || true

pm2 jlist 2>/dev/null | python3 -c "
import json,sys
data=json.load(sys.stdin)
out=[]
for p in data:
 e=p.get('pm2_env') or {}
 out.append({
   'name': p.get('name'),
   'pid': p.get('pid'),
   'status': e.get('status'),
   'script': e.get('pm_exec_path'),
   'cwd': e.get('pm_cwd'),
   'restarts': e.get('restart_time'),
   'created_at': e.get('created_at'),
 })
print(json.dumps(out, indent=2))
" > "$EV/pm2-processes.snapshot.json" 2>/dev/null || true

echo "SECURITY-BASELINE-01 evidence refreshed → $EV"
