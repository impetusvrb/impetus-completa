#!/usr/bin/env bash
# Bloco 1 — Verificar se .env foi commitado historicamente
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

if ! git rev-parse --is-inside-work-tree &>/dev/null; then
  echo "NOT A GIT REPO — skip git history check"
  exit 0
fi

echo "=== Git history for .env files ==="
PATTERNS=(".env" "backend/.env" "frontend/.env" ".env.production" "**/.env")

found=0
for p in "${PATTERNS[@]}"; do
  hits=$(git log --all --oneline --full-history -- "$p" 2>/dev/null | head -5)
  if [[ -n "$hits" ]]; then
    echo "COMMITS FOUND for $p:"
    echo "$hits"
    found=1
  fi
done

if [[ "$found" -eq 0 ]]; then
  echo "OK — nenhum commit de .env encontrado nos padrões verificados"
else
  echo
  echo "ACÇÃO: rotacionar TODAS as credenciais que existiram nesses commits"
  exit 1
fi
