#!/usr/bin/env bash
# =============================================================================
# IMPETUS — Restaurar .gitignore e limpar cache do Git
#
# Uso (na raiz do repositório):
#   bash scripts/git-ignore-setup-and-cache-clean.sh
#   bash scripts/git-ignore-setup-and-cache-clean.sh --dry-run
#
# O que faz:
#   1. Garante .gitignore na raiz (restaura do HEAD se faltar)
#   2. Remove do índice Git pastas que não devem ser versionadas (sem apagar disco)
#   3. Recarrega o índice respeitando o .gitignore atual
# =============================================================================

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

DRY_RUN=0
if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN=1
  echo "[DRY-RUN] Nenhuma alteração será aplicada."
fi

run() {
  if [[ "$DRY_RUN" == "1" ]]; then
    echo "  would run: $*"
  else
    "$@"
  fi
}

echo "=== IMPETUS — Git ignore + cache clean ==="
echo "Raiz: $ROOT"
echo ""

# --- Diagnóstico: pastas pesadas ---
echo ">>> Pastas pesadas no disco (amostra):"
for p in \
  backend/node_modules \
  frontend/node_modules \
  admin-portal/node_modules \
  impetus_complete/backend/node_modules \
  impetus_complete/frontend/node_modules \
  deploy_backups \
  frontend/dist \
  admin-portal/dist \
  backups \
  backend/backups \
  lipsync/Wav2Lip \
  .git
do
  if [[ -e "$p" ]]; then
    du -sh "$p" 2>/dev/null || true
  fi
done
echo ""

# --- .gitignore ---
if [[ ! -f .gitignore ]]; then
  echo ">>> .gitignore ausente — a restaurar do último commit (HEAD)..."
  if git show HEAD:.gitignore >/dev/null 2>&1; then
    run git checkout HEAD -- .gitignore
    echo "    Restaurado de HEAD. Revise e acrescente entradas novas se necessário."
  else
    echo "    ERRO: não há .gitignore em HEAD. Crie manualmente na raiz."
    exit 1
  fi
else
  echo ">>> .gitignore já existe na raiz."
fi
echo ""

# --- Contagem antes ---
BEFORE_STATUS=$(git status -u --short 2>/dev/null | wc -l | tr -d ' ')
TRACKED_HEAVY=$(git ls-files 2>/dev/null | grep -E 'node_modules/|deploy_backups/|/dist/|__pycache__|\.env\.edge-agent|\.opcua-lab-' | wc -l | tr -d ' ' || echo 0)
echo ">>> Antes: linhas em git status -u: $BEFORE_STATUS"
echo ">>> Antes: ficheiros pesados ainda no índice: $TRACKED_HEAVY"
echo ""

# --- Remover do índice (não apaga ficheiros locais) ---
PATHS_TO_UNTRACK=(
  node_modules
  deploy_backups
  backups
  backend/backups
  backend/data
  backend/logs
  frontend/dist
  frontend/dist.prev.
  frontend/dist_backup_
  admin-portal/dist
  admin-portal/node_modules
  impetus_complete
  lipsync/.venv
  backend/.env.edge-agent
  backend/.opcua-lab-endpoint.txt
  backend/.opcua-lab-nodes.json
)

echo ">>> A remover do índice Git (se estiverem tracked)..."
for rel in "${PATHS_TO_UNTRACK[@]}"; do
  if git ls-files --error-unmatch "$rel" >/dev/null 2>&1 || git ls-files "$rel" 2>/dev/null | grep -q .; then
    echo "    git rm -r --cached --ignore-unmatch $rel"
    run git rm -r --cached --ignore-unmatch "$rel" 2>/dev/null || true
  fi
done

# Globais comuns acidentalmente commitados
if [[ "$TRACKED_HEAVY" -gt 0 ]]; then
  echo ">>> Limpeza adicional por padrão no índice..."
  while IFS= read -r f; do
    [[ -z "$f" ]] && continue
    run git rm -r --cached --ignore-unmatch "$f"
  done < <(git ls-files | grep -E 'node_modules/|deploy_backups/|__pycache__/|\.pyc$|backend/\.env\.edge-agent|\.opcua-lab-' || true)
fi
echo ""

# --- Recarregar índice ---
echo ">>> git add .gitignore && git status (resumo)"
run git add .gitignore
echo ""

if [[ "$DRY_RUN" == "0" ]]; then
  AFTER_STATUS=$(git status -u --short 2>/dev/null | wc -l | tr -d ' ')
  echo ">>> Depois: linhas em git status -u: $AFTER_STATUS (antes: $BEFORE_STATUS)"
  git status -sb | head -20
  echo ""
  echo "Concluído. Se ainda vir milhares de ficheiros untracked:"
  echo "  1. Confirme que .gitignore contém node_modules/ e deploy_backups/"
  echo "  2. Reinicie o Cursor/VS Code (recarrega file watcher)"
  echo "  3. Opcional: git update-index --refresh"
  run git update-index --refresh 2>/dev/null || true
else
  echo "Dry-run terminado. Execute sem --dry-run para aplicar."
fi
