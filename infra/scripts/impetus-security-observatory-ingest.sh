#!/usr/bin/env bash
# Alimenta o Observatório SEC-01 com linhas recentes do nginx access log.
# Cron sugerido: */5 * * * * root bash /var/www/impetus-completa/infra/scripts/impetus-security-observatory-ingest.sh
set -euo pipefail

REPO_ROOT="${REPO_ROOT:-/var/www/impetus-completa}"
LOG="${IMPETUS_NGINX_ACCESS:-/var/log/nginx/impetus-access.log}"
LINES="${IMPETUS_SEC_INGEST_LINES:-800}"

cd "$REPO_ROOT/backend"
export NODE_PATH="$REPO_ROOT/backend/node_modules"

node -e "
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join('$REPO_ROOT/backend/.env') });
const ingest = require('./src/securityObservatory/ingest/nginxLogIngestor');
const log = '$LOG';
if (!fs.existsSync(log)) { console.log('[SKIP] sem access.log'); process.exit(0); }
const { execFileSync } = require('child_process');
const raw = execFileSync('tail', ['-n', '$LINES', log], { encoding: 'utf8', maxBuffer: 8*1024*1024 });
const lines = raw.split('\\n').filter(Boolean);
const r = ingest.ingestNginxLines(lines);
console.log(JSON.stringify({ event: 'SEC01_NGINX_INGEST', ...r, lines: lines.length }));
" 2>&1 | tail -1
