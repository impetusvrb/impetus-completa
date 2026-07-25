#!/usr/bin/env bash
# SEC-21 — Aplicar activação operacional Enterprise Security em produção
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
EVIDENCE="$ROOT/backend/docs/evidence/sec-21"
TARGET="$ROOT/backend/.env"
PROMOTION="$EVIDENCE/promotion-target.env"
BACKUP="$ROOT/backend/.env.sec21-backup-$(date +%Y%m%d_%H%M%S)"

DRY_RUN=true
if [[ "${1:-}" == "--apply" ]]; then
  DRY_RUN=false
fi

echo "SEC-21 — Enterprise Production Security Activation"
echo "Root: $ROOT"

if [[ ! -f "$PROMOTION" ]]; then
  echo "ERRO: promotion-target.env não encontrado. Correr SEC_21_PRODUCTION_ACTIVATION.test.js primeiro."
  exit 1
fi

GATE_REPORT="$EVIDENCE/../sec-21c/go-live-validation-latest.json"
LEGACY_GATE="$EVIDENCE/../sec-21a/go-live-latest.json"

check_gate_decision() {
  local report="$1"
  local label="$2"
  if [[ -f "$report" ]]; then
    DECISION=$(grep -o '"goLiveDecision"[[:space:]]*:[[:space:]]*"[^"]*"' "$report" | head -1 | sed 's/.*"\([^"]*\)"$/\1/')
    if [[ "$DECISION" != "GO_LIVE_APPROVED" && "$DECISION" != "GO_LIVE_APPROVED_WITH_REMARKS" ]]; then
      echo "AVISO: ${label} = ${DECISION:-UNKNOWN}"
      return 1
    fi
    echo "OK: ${label} = ${DECISION}"
    return 0
  fi
  return 2
}

if ! check_gate_decision "$GATE_REPORT" "SEC-21C Go-Live Validation"; then
  echo "Correr: node backend/src/tests/audit/SEC_21C_GO_LIVE_VALIDATION.test.js"
  if check_gate_decision "$LEGACY_GATE" "SEC-21A (legacy)" 2>/dev/null; then
    echo "AVISO: SEC-21A aprovado mas SEC-21C ausente/negado — preferir SEC-21C como autorização final."
  fi
  if [[ "${SEC21_FORCE_APPLY:-}" != "1" ]]; then
    echo "Abortado. Defina SEC21_FORCE_APPLY=1 para ignorar (não recomendado)."
    exit 1
  fi
elif [[ ! -f "$GATE_REPORT" ]]; then
  echo "AVISO: SEC-21C go-live-validation-latest.json não encontrado — executar SEC-21C antes do apply."
fi

if [[ "$DRY_RUN" == true ]]; then
  echo "[DRY-RUN] Ficheiros que seriam actualizados:"
  echo "  - $TARGET (backup → $BACKUP)"
  echo "  - merge de $PROMOTION"
  echo ""
  echo "Flags a activar:"
  grep -E '^SECURITY_' "$PROMOTION" | head -25
  echo ""
  echo "Para aplicar: $0 --apply"
  exit 0
fi

if [[ ! -f "$TARGET" ]]; then
  echo "ERRO: $TARGET não existe"
  exit 1
fi

cp -a "$TARGET" "$BACKUP"
echo "Backup: $BACKUP"

# Merge: actualiza ou adiciona linhas SECURITY_ do promotion-target
while IFS= read -r line; do
  [[ "$line" =~ ^#.*$ ]] && continue
  [[ -z "$line" ]] && continue
  key="${line%%=*}"
  if grep -q "^${key}=" "$TARGET" 2>/dev/null; then
    sed -i "s|^${key}=.*|${line}|" "$TARGET"
  else
    echo "$line" >> "$TARGET"
  fi
done < "$PROMOTION"

chmod 600 "$TARGET"
echo "OK: .env actualizado"
echo "Próximo passo: pm2 restart impetus-backend --update-env"
echo "Rollback: cp $BACKUP $TARGET && pm2 restart impetus-backend --update-env"
