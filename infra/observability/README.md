# IMPETUS — Stack Observabilidade (PROMPT 14)

## Componentes

- **Prometheus** — scrape métricas do backend
- **Grafana** — dashboards operacional, cognitivo, LGPD, AI safety
- **OTEL Collector** (profile `otel`) — recebe traces HTTP JSON do `otlpExporter.js`

## Quick start

```bash
# 1. Backend com flags (ver backend/.env PROMPT 14)
pm2 restart impetus-backend --update-env

# 2. Stack local
cd infra/observability
export IMPETUS_BACKEND_METRICS_HOST=host.docker.internal:3333
docker compose up -d prometheus grafana

# 3. Grafana UI
open http://localhost:3001
# user: admin  password: changeme (alterar via GRAFANA_ADMIN_PASSWORD)
```

## Scrape Prometheus

O endpoint `/api/internal/observability/metrics` requer autenticação interna.
Configure `bearer_token_file` em `prometheus/prometheus.yml` ou reverse proxy mTLS.

## Activar OTLP export

```env
IMPETUS_OTEL_EXPORTER_ENABLED=true
IMPETUS_OTEL_ENDPOINT=http://127.0.0.1:4318
IMPETUS_APM_SHADOW_MODE=false
```

```bash
docker compose --profile otel up -d
```
