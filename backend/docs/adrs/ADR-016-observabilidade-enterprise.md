# ADR-016 — Observabilidade Enterprise

**Status:** Aceite  
**Data:** 2026-06-30  
**Certificação:** CERT-ONPREM-INFRA-01

---

## Contexto

Stack existente: PM2 logs, nginx logs, `/health`, `/api/system/health/deep`, Prometheus/Grafana opt-in em `infra/observability/docker-compose.yml`.

---

## Problema

Definir observabilidade Enterprise sem alterar código de métricas.

---

## Decisão

**Modelo em camadas:**

1. **Obrigatório ops:** health poll, logs em `${IMPETUS_HOME}/logs/`, rotação
2. **Opcional:** Prometheus scrape `:4000/api/internal/observability/metrics` (flag on)
3. **Opcional:** Grafana + OTEL em `${IMPETUS_HOME}/monitoring/`

Retenção: audit 90d; Prometheus TSDB 15d default; logs 30-90d.

Alertas: Grafana ou externo (não SaaS IMPETUS).

---

## Consequências

- Corrigir scrape target `:4000` (não `:3333`) no runbook
- Air-Gapped: stack observabilidade 100% local

---

## Alternativas descartadas

| Alternativa | Motivo |
|-------------|--------|
| SaaS monitoring IMPETUS centralizado | Viola on-prem |
| Métricas obrigatórias day-1 | Flag off default conservador |

---

## Referências

- `infra/observability/docker-compose.yml`
- `backend/src/routes/internal/enterpriseObservability.js`
