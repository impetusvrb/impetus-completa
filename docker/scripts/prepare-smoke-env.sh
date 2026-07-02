#!/usr/bin/env bash
# Prepara ambiente smoke Docker — CERT-ONPREM-CONTAINER-01
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

IMPETUS_HOME="${IMPETUS_HOME:-$ROOT/.impetus-home-smoke}"
COMPOSE_ENV="$ROOT/.env.docker-smoke"

mkdir -p "$IMPETUS_HOME/config" \
  "$IMPETUS_HOME/uploads" \
  "$IMPETUS_HOME/data" \
  "$IMPETUS_HOME/logs/backend" \
  "$IMPETUS_HOME/logs/frontend" \
  "$IMPETUS_HOME/logs/nginx" \
  "$IMPETUS_HOME/licenses" \
  "$IMPETUS_HOME/certificates" \
  "$IMPETUS_HOME/backups" \
  "$IMPETUS_HOME/temp" \
  "$IMPETUS_HOME/runtime" \
  "$IMPETUS_HOME/database"

SMOKE_PG_PASS="${SMOKE_PG_PASS:-impetus_smoke_$(openssl rand -hex 8 2>/dev/null || echo test1234)}"
JWT_SECRET="${JWT_SECRET:-smoke_jwt_secret_min_32_characters_long}"

if [[ ! -f "$IMPETUS_HOME/config/.env" ]]; then
  cp docker/config/env.enterprise.example "$IMPETUS_HOME/config/.env"
  sed -i "s/ALTERAR_SENHA/$SMOKE_PG_PASS/g" "$IMPETUS_HOME/config/.env"
  sed -i "s/GERAR_STRING_ALEATORIA_MIN_32_CHARS/$JWT_SECRET/g" "$IMPETUS_HOME/config/.env"
  sed -i "s/AlterarSenhaForte1/SmokeTest1/g" "$IMPETUS_HOME/config/.env"
fi

cat > "$COMPOSE_ENV" <<EOF
IMPETUS_HOME=$IMPETUS_HOME
POSTGRES_USER=impetus_app
POSTGRES_PASSWORD=$SMOKE_PG_PASS
POSTGRES_DB=impetus_db
IMPETUS_HTTP_PORT=${IMPETUS_HTTP_PORT:-8088}
IMPETUS_IMAGE_TAG=smoke
EOF

echo "IMPETUS_HOME=$IMPETUS_HOME"
echo "COMPOSE_ENV=$COMPOSE_ENV"
echo "HTTP_PORT=${IMPETUS_HTTP_PORT:-8088}"
