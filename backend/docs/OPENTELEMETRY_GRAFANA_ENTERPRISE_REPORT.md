# OpenTelemetry + Prometheus + Grafana — Relatório Enterprise (PROMPT 14)

**Data:** 2026-05-27  
**Item roadmap:** T1.12 (`FINAL_STRATEGIC_DEVELOPMENT_ROADMAP.md`)  
**Modo inicial:** shadow (`IMPETUS_APM_ENTERPRISE_MODE=shadow`, sampling 10%)

---

## 1. Objectivo

Observabilidade externa enterprise-grade sobre a fundação Wave 2 existente: OpenTelemetry-compatible export, scrape Prometheus, dashboards Grafana, tracing distribuído, SLOs/SLAs e alertas observe-only — sem SDK no hot path e sem degradação severa de produção.

## 2. Arquitectura

```
HTTP → observabilityMiddleware → tenantMetrics + SLO HTTP
         │
         ├── dashboardCompositionGateway → apmEnterpriseBridge (dashboard latency)
         ├── chat trace (aiAnalyticsService) → AI latency
         ├── SZ5 injector → SZ5 latency
         ├── hallucinationDetection → AI safety metrics
         │
Periodic → enterpriseObservabilityV2Runtime.collectPeriodicSnapshot
         ├── alertEvaluator (SLO burn, AI latency, error rate)
         └── otlpExporter (opcional, HTTP JSON /v1/traces)

Prometheus scrape → GET /api/internal/observability/metrics (auth interna)
Grafana → infra/observability/docker-compose.yml
```

## 3. Capacidades (checklist PROMPT 14)

| # | Capacidade | Implementação |
|---|------------|---------------|
| 1 | OpenTelemetry | `otlpExporter.js` + spans via `apmEnterpriseBridge` + `enterpriseObservabilityRuntime` |
| 2 | Prometheus | `tenantMetricsRegistry` + `exportPrometheus()` + endpoint `/metrics` |
| 3 | Grafana | `infra/observability/` docker-compose + 4 dashboards JSON |
| 4 | Distributed tracing | correlation middleware + spans OTLP-compatible |
| 5 | Spans | `recordSpan()` / `startTrace()` |
| 6 | Runtime metrics | HTTP, saturation, DLQ, event lag (Wave 2) |
| 7 | AI latency | Hook `aiAnalyticsService` → `recordAiLatency` |
| 8 | Dashboard latency | Hook `dashboardCompositionGateway` |
| 9 | SZ5 metrics | Hook `zUnifiedConversationalContextInjector` |
| 10 | Runtime health | `impetus_runtime_health` gauge no boot |
| 11 | Error rates | `impetus_errors_total` + SLO `error_rate` |
| 12 | Throughput | `impetus_throughput_total` por domínio |
| 13 | Tenant metrics | cardinality cap (top-N tenants) |
| 14 | Governance metrics | `impetus_governance_events_total` |
| 15 | Alerting | `alertEvaluator.js` + `prometheus/alerts.yml` |
| 16 | SLOs | `sloSliRegistry.js` (+ dashboard/AI/SZ5/error/AI safety) |
| 17 | SLAs | `GET /api/internal/observability/slas` |

## 4. Flags

| Flag | Default (rollout) | Efeito |
|------|-------------------|--------|
| `IMPETUS_OBSERVABILITY_V2_ENABLED` | `true` | Master gate Wave 2 |
| `IMPETUS_APM_ENTERPRISE_ENABLED` | `true` | Bridge PROMPT 14 |
| `IMPETUS_APM_ENTERPRISE_MODE` | `shadow` | shadow/audit/enforce |
| `IMPETUS_APM_SHADOW_MODE` | `true` | Suprime pressão OTLP |
| `IMPETUS_APM_SAMPLING_RATE` | `0.1` | 10% spans (custo/overhead) |
| `IMPETUS_PROMETHEUS_ENDPOINT_ENABLED` | `true` | Export texto Prometheus |
| `IMPETUS_OTEL_EXPORTER_ENABLED` | `false` | OTLP HTTP (requer endpoint) |
| `IMPETUS_OTEL_ENDPOINT` | (vazio) | Collector URL |
| `IMPETUS_SLO_MONITORING_ENABLED` | `true` | SLO/SLI evaluation |
| `IMPETUS_OBSERVABILITY_ALERTS_ENFORCE` | `false` | Alertas só log |
| `IMPETUS_GRAFANA_STACK_ENABLED` | `false` | Documentação stack Docker |

**Flag Reconciler:** V2, APM, OTEL registadas em `CRITICAL_FLAGS`.

## 5. Sampling & custo telemetria

| Modo | Sampling | OTLP | Overhead estimado |
|------|----------|------|-------------------|
| shadow | 10% | off | < 1ms amortizado por request amostrado |
| audit | 25% | on se endpoint | + rede batch 15s |
| enforce | configurável | on | monitorizar p95 HTTP |

**Validação recomendada:** comparar p95 HTTP com V2=off vs shadow 7 dias antes de enforce.

## 6. Ficheiros novos/alterados

| Ficheiro | Tipo |
|----------|------|
| `backend/src/observability/apmEnterpriseBridge.js` | Novo — orquestrador APM |
| `backend/src/observability/observabilityFlags.js` | Flags PROMPT 14 |
| `backend/src/observability/sloSliRegistry.js` | SLOs AI/dashboard/SZ5 |
| `backend/src/observability/alertEvaluator.js` | Alertas AI/LGPD |
| `infra/observability/*` | Prometheus + Grafana + OTEL collector |
| Hooks: gateway, SZ5, aiAnalytics, hallucination | Instrumentação |

## 7. Rotas

| Método | Rota | RBAC |
|--------|------|------|
| GET | `/api/internal/observability/metrics` | Internal enterprise |
| GET | `/api/internal/observability/apm` | Internal |
| GET | `/api/internal/observability/slas` | Internal |
| GET | `/api/admin/runtime/observability-apm` | Admin |
| GET | `/api/admin/runtime/observability-prometheus-preview` | Admin |

## 8. Dashboards Grafana

| Dashboard | UID | Foco |
|-----------|-----|------|
| Operacional | `impetus-operational` | HTTP, throughput, errors, SLO burn |
| Cognitivo | `impetus-cognitive` | Dashboard/AI/SZ5 latency, pressão cognitiva |
| LGPD | `impetus-lgpd` | Eventos LGPD/governance |
| AI Safety | `impetus-ai-safety` | Hallucination, confidence, review rate |

**Subir stack:**
```bash
cd /var/www/impetus-completa/infra/observability
docker compose up -d prometheus grafana
# Grafana: http://localhost:3001 (admin/changeme)
```

## 9. Rollout

1. **Fase shadow** (actual): V2+APM on, sampling 10%, OTLP off.
2. **Fase audit:** `IMPETUS_APM_ENTERPRISE_MODE=audit`, activar collector, `IMPETUS_OTEL_EXPORTER_ENABLED=true`.
3. **Fase enforce:** aumentar sampling; `IMPETUS_OBSERVABILITY_ALERTS_ENFORCE=true` só após 7d observe-only.

## 10. Rollback

```bash
IMPETUS_OBSERVABILITY_V2_ENABLED=false
IMPETUS_APM_ENTERPRISE_ENABLED=false
pm2 restart impetus-backend --update-env
```

Comportamento idêntico ao pré-Wave 2 (zero overhead).

## 11. Riscos

| Risco | Mitigação |
|-------|-----------|
| Overhead produção | Sampling + shadow + sem SDK |
| Cardinality explosion | `IMPETUS_TENANT_METRICS_CARDINALITY_CAP=25` |
| Custo OTLP | Batch + circuit breaker 5min em `otlpExporter` |
| Scrape sem auth | Rede interna + bearer token Prometheus |
| Falsos alertas | `OBSERVABILITY_ALERTS_ENFORCE=false` |

## 12. Dependências

- Wave 2: `enterpriseObservabilityV2Runtime`, `tenantMetricsRegistry`, `otlpExporter`
- Hot paths: Engine V2 gateway, SZ5 injector, `aiAnalyticsService`, hallucination V1
- Infra opcional: Docker Prometheus/Grafana

## 13. SLAs (T1.12 gate)

| SLA | Alvo | SLI |
|-----|------|-----|
| Dashboard `/me` compose | p95 < 1500ms | `dashboard_latency_p95` |
| Chat IA resposta | p95 < 1500ms | `ai_chat_latency_p95` |
| SZ5 context build | p95 < 800ms | `sz5_query_latency_p95` |
| Disponibilidade API | 99.5% | `api_availability` |

---

*Gerado no âmbito PROMPT 14 — IMPETUS Comunica IA.*
