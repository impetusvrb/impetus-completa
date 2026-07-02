# IMPETUS Enterprise — Frontend oficial
# CERT-ONPREM-CONTAINER-01 · build Vite inalterado + PM2 Runtime (preview:prod)

# --- build ---
FROM node:20-bookworm-slim AS build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci
COPY frontend/ ./
ARG VITE_API_URL=/api
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build

# --- produção ---
FROM node:20-bookworm-slim AS production
LABEL org.opencontainers.image.title="impetus-frontend-enterprise" \
      org.opencontainers.image.vendor="IMPETUS"

RUN apt-get update \
  && apt-get install -y --no-install-recommends curl ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && npm install -g pm2@5.4.3 \
  && groupadd --gid 1000 impetus \
  && useradd --uid 1000 --gid impetus --shell /usr/sbin/nologin --create-home impetus

WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci --omit=dev

COPY --from=build /app/frontend/dist ./dist
COPY frontend/serveDist.cjs ./serveDist.cjs

COPY docker/ecosystem.frontend.container.cjs /app/docker/ecosystem.frontend.container.cjs
COPY docker/scripts/frontend-entrypoint.sh /usr/local/bin/impetus-frontend-entrypoint.sh
RUN chmod +x /usr/local/bin/impetus-frontend-entrypoint.sh \
  && chown -R impetus:impetus /app/frontend /app/docker

ENV NODE_ENV=production \
    IMPETUS_HOME=/opt/impetus \
    PM2_HOME=/opt/impetus/runtime/pm2-frontend \
    DIST_DIR=dist

USER impetus

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD curl -sf "http://127.0.0.1:3000/" -o /dev/null || exit 1

STOPSIGNAL SIGTERM

ENTRYPOINT ["/usr/local/bin/impetus-frontend-entrypoint.sh"]
