#!/usr/bin/env bash
# ============================================================================
# IMPETUS - Backup do banco ANTES da migração ManuIA
# Executar manualmente antes de aplicar migrations
# Uso: ./scripts/backup-db-before-manuia.sh
# Ou: bash scripts/backup-db-before-manuia.sh
# ============================================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="${ROOT_DIR}/.env"

# Carregar variáveis (se .env existir)
if [ -f "$ENV_FILE" ]; then
  set -a
  source "$ENV_FILE"
  set +a
fi

DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-impetus_db}"
DB_USER="${DB_USER:-postgres}"
BACKUP_DIR="${ROOT_DIR}/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/pre_manuia_${TIMESTAMP}.sql"

mkdir -p "$BACKUP_DIR"

echo "[BACKUP] Iniciando pg_dump em $BACKUP_FILE"
if PGPASSWORD="$DB_PASSWORD" pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -F p -f "$BACKUP_FILE"; then
  echo "[BACKUP] OK: $BACKUP_FILE"
  echo "[BACKUP] Tamanho: $(du -h "$BACKUP_FILE" | cut -f1)"
else
  echo "[BACKUP] ERRO: falha no pg_dump"
  exit 1
fi
