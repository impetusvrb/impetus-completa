#!/usr/bin/env bash
# Publica .github/workflows/cert-drift.yml via GitHub API.
# Requer token com scope workflow (além de repo).
#
# Uso:
#   export GITHUB_WORKFLOW_TOKEN='ghp_...'   # scope: repo + workflow
#   bash scripts/publish-github-workflow.sh
#
# Ou adicionar GITHUB_WORKFLOW_TOKEN=... em backend/.env (não commitar).

set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WF="$ROOT/.github/workflows/cert-drift.yml"

if [[ -f "$ROOT/backend/.env" ]]; then
  # shellcheck disable=SC1091
  set -a
  source <(grep -E '^GITHUB_WORKFLOW_TOKEN=' "$ROOT/backend/.env" 2>/dev/null || true)
  set +a
fi

TOKEN="${GITHUB_WORKFLOW_TOKEN:-${GH_TOKEN:-}}"
if [[ -z "$TOKEN" ]]; then
  echo "ERRO: defina GITHUB_WORKFLOW_TOKEN (scope repo + workflow)." >&2
  echo "  GitHub → Settings → Developer settings → Personal access tokens" >&2
  exit 1
fi

if [[ ! -f "$WF" ]]; then
  echo "ERRO: workflow não encontrado: $WF" >&2
  exit 1
fi

CONTENT_B64=$(base64 -w0 "$WF" 2>/dev/null || base64 "$WF" | tr -d '\n')
SHA=""
EXISTING=$(curl -sS -H "Authorization: token $TOKEN" -H "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/impetusvrb/impetus-completa/contents/.github/workflows/cert-drift.yml" || true)
SHA=$(node -e "try{const j=JSON.parse(process.argv[1]);process.stdout.write(j.sha||'')}catch(e){}" "$EXISTING" 2>/dev/null || true)

PAYLOAD=$(node -e "
const fs=require('fs');
const o={message:'ci: gate drift da matriz funcional (Parte 9 CERT)',content:process.argv[1],branch:'main'};
if(process.argv[2]) o.sha=process.argv[2];
console.log(JSON.stringify(o));
" "$CONTENT_B64" "$SHA")

HTTP=$(curl -sS -o /tmp/gh-wf-resp.json -w '%{http_code}' \
  -X PUT \
  -H "Authorization: token $TOKEN" \
  -H "Accept: application/vnd.github+json" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD" \
  "https://api.github.com/repos/impetusvrb/impetus-completa/contents/.github/workflows/cert-drift.yml")

if [[ "$HTTP" != "200" && "$HTTP" != "201" ]]; then
  echo "ERRO HTTP $HTTP:" >&2
  cat /tmp/gh-wf-resp.json >&2
  exit 1
fi

echo "OK: workflow publicado (HTTP $HTTP)."
echo "Ver: https://github.com/impetusvrb/impetus-completa/actions"
