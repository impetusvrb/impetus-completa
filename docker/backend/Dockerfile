# IMPETUS Enterprise — Backend oficial
# CERT-ONPREM-CONTAINER-01 · empacotamento apenas
# Runtime oficial: PM2 Runtime (pm2-runtime) — NÃO substituir por node/tini directo

# --- deps + build nativo (bcrypt, etc.) ---
FROM node:20-bookworm-slim AS deps
WORKDIR /app/backend
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY backend/package.json backend/package-lock.json* ./
RUN npm ci --omit=dev --ignore-scripts
COPY backend/ ./
RUN npm rebuild bcrypt --build-from-source 2>/dev/null || true \
  && node scripts/fix-opcua-hexy-cjs.js 2>/dev/null || true

# --- produção ---
FROM node:20-bookworm-slim AS production
LABEL org.opencontainers.image.title="impetus-backend-enterprise" \
      org.opencontainers.image.vendor="IMPETUS" \
      org.opencontainers.image.description="Backend Enterprise — PM2 Runtime certificado"

RUN apt-get update \
  && apt-get install -y --no-install-recommends curl postgresql-client ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && npm install -g pm2@5.4.3 \
  && groupadd --gid 1000 impetus \
  && useradd --uid 1000 --gid impetus --shell /usr/sbin/nologin --create-home impetus

WORKDIR /app/backend

COPY --from=deps /app/backend/node_modules ./node_modules
COPY backend/ ./

COPY docker/ecosystem.backend.container.cjs /app/docker/ecosystem.backend.container.cjs
COPY docker/scripts/backend-entrypoint.sh /usr/local/bin/impetus-backend-entrypoint.sh
COPY docker/scripts/wait-for-postgres.sh /usr/local/bin/wait-for-postgres.sh
RUN chmod +x /usr/local/bin/impetus-backend-entrypoint.sh /usr/local/bin/wait-for-postgres.sh \
  && chown -R impetus:impetus /app/backend /app/docker

ENV NODE_ENV=production \
    IMPETUS_HOME=/opt/impetus \
    PM2_HOME=/opt/impetus/runtime/pm2-backend

USER impetus

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=120s --retries=3 \
  CMD curl -sf "http://127.0.0.1:4000/health" | grep -q '"status"' || exit 1

STOPSIGNAL SIGTERM

ENTRYPOINT ["/usr/local/bin/impetus-backend-entrypoint.sh"]
