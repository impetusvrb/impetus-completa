#!/usr/bin/env bash
# APPSEC-02A — Cleanup oficial de artefactos .env (NUNCA executa sem flag explícita)
# Uso:
#   ./scripts/security/cleanup-env-artifacts.sh --dry-run
#   ./scripts/security/cleanup-env-artifacts.sh --apply
#   ./scripts/security/cleanup-env-artifacts.sh --rollback

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ARCHIVE_DIR="${IMPETUS_ENV_ARCHIVE_DIR:-$BACKEND_ROOT/.impetus-env-archive}"
MANIFEST="$ARCHIVE_DIR/manifest.json"
DRY_RUN=false
APPLY=false
ROLLBACK=false

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    --apply) APPLY=true ;;
    --rollback) ROLLBACK=true ;;
    *) echo "Flag desconhecida: $arg"; exit 1 ;;
  esac
done

if ! $DRY_RUN && ! $APPLY && ! $ROLLBACK; then
  echo "Especificar --dry-run, --apply ou --rollback"
  exit 1
fi

mkdir -p "$ARCHIVE_DIR"

inventory() {
  node -e "
    const e = require('$BACKEND_ROOT/src/securityOperationalReadiness/secretCleanupEngine');
    const r = e.generateSecretCleanupReport({ backendRoot: '$BACKEND_ROOT' });
    console.log(JSON.stringify(r, null, 2));
  "
}

if $ROLLBACK; then
  if [[ ! -f "$MANIFEST" ]]; then
    echo "Rollback impossível: manifest ausente em $MANIFEST"
    exit 1
  fi
  echo "[ROLLBACK] Restaurar a partir de $MANIFEST — revisão manual recomendada"
  cat "$MANIFEST"
  exit 0
fi

REPORT=$(inventory)
echo "$REPORT" > "$BACKEND_ROOT/docs/evidence/appsec-02a/secret-cleanup-dry-run.json"

TARGETS=$(echo "$REPORT" | node -e "
  let d=''; process.stdin.on('data',c=>d+=c);
  process.stdin.on('end',()=>{
    const j=JSON.parse(d);
    const files=[...(j.cleanup_plan?.steps||[]).flatMap(s=>s.files||[])];
    console.log(files.join('\n'));
  });
")

if $DRY_RUN; then
  echo "=== DRY-RUN — ficheiros candidatos a arquivar/remover ==="
  echo "$TARGETS" | while read -r f; do
    [[ -z "$f" ]] && continue
    [[ -f "$f" ]] && echo "  WOULD_ARCHIVE: $f" || echo "  MISSING: $f"
  done
  echo ""
  echo "Plano gravado em docs/evidence/appsec-02a/secret-cleanup-dry-run.json"
  echo "Para aplicar: $0 --apply (após rotação de segredos)"
  exit 0
fi

if $APPLY; then
  echo "=== APPLY — arquivar artefactos UNSAFE/BACKUP ==="
  TS=$(date -u +%Y%m%dT%H%M%SZ)
  BATCH="$ARCHIVE_DIR/batch-$TS"
  mkdir -p "$BATCH"
  ARCHIVED=()
  echo "$TARGETS" | while read -r f; do
    [[ -z "$f" ]] && continue
    [[ ! -f "$f" ]] && continue
    base=$(basename "$f")
    cp "$f" "$BATCH/$base"
    rm "$f"
    echo "  ARCHIVED+REMOVED: $f -> $BATCH/$base"
    ARCHIVED+=("$f")
  done
  echo "{\"batch\":\"$BATCH\",\"archived_at\":\"$TS\",\"files\":$(node -e "const fs=require('fs');const t=fs.readFileSync(0,'utf8').trim().split('\\n').filter(Boolean);console.log(JSON.stringify(t));" <<< "$TARGETS")}" > "$MANIFEST"
  echo "Manifest: $MANIFEST"
  echo "Rollback: $0 --rollback"
fi
