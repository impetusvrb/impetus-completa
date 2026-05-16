# WAVE 2 — Plano Técnico: Observabilidade Enterprise Industrial

> Opt-in, gated, low-overhead, rollback-safe. **Não** inclui dashboards industriais finais, módulos de negócio, IA autónoma nem analytics pesados.

## 1. Arquitetura

```
HTTP Request
    │
    ▼
correlationIdMiddleware ──► correlationContext (ALS)
    │
    ▼
impetusAsyncContextBind ──► trace_id, workflow_id, company_id
    │
    ├──► workflowTracingService ──► enterpriseObservabilityRuntime (spans)
    ├──► tenantMetricsRegistry (cardinality-capped)
    ├──► sloSliRegistry (SLI burn / error budget)
    ├──► saturationMonitor
    ├──► eventLagMonitor ◄── industrial outbox
    ├──► dlqMonitor ◄── industrial DLQ
    └──► cognitivePressureObservability ◄── cognitivePressureService

Periodic (unref timer, só se flags ON):
    otlpExporter ──► IMPETUS_OTEL_ENDPOINT (HTTP JSON traces/metrics)
```

**Master gate:** `IMPETUS_OBSERVABILITY_V2_ENABLED=false` (desliga toda a WAVE 2).

## 2. Tracing map

| Camada | trace_id | correlation_id | causation_id | workflow_id |
|--------|----------|----------------|---------------|-------------|
| HTTP | `X-Request-Id` / `req.id` | igual a trace_id | parent span | `X-Workflow-Id` header |
| ALS request | `requestAsyncContext` | propagado | — | opcional |
| Evento industrial | envelope.trace_id | envelope.correlation_id | envelope.causation_id | envelope.workflow_id |
| ai_decision_logs | coluna trace_id | — | — | metadata.workflow_id |
| Workflow trace | `wf_<id>` | request correlation | step anterior | workflow_id |

## 3. Métricas necessárias

| Métrica | Tipo | Labels (cardinality) |
|---------|------|----------------------|
| `impetus_http_requests_total` | counter | method, status_class |
| `impetus_http_duration_ms` | histogram (buckets in-memory) | route_group |
| `impetus_workflow_steps_total` | counter | workflow_type, status |
| `impetus_outbox_lag_ms` | gauge | domain |
| `impetus_outbox_pending` | gauge | — |
| `impetus_dlq_depth` | gauge | domain |
| `impetus_dlq_ingress_total` | counter | domain |
| `impetus_saturation_score` | gauge | subsystem |
| `impetus_cognitive_pressure` | gauge | dimension |
| `impetus_slo_burn_rate` | gauge | sli_name |

## 4. Cardinality strategy

- `IMPETUS_TENANT_METRICS_CARDINALITY_CAP` (default **25**): apenas top-N `company_id` por janela; restantes → label `tenant_bucket="others"`.
- Rotas HTTP agregadas em **route_group** (prefixo `/api/...` truncado), nunca path completo com IDs.
- Domínios de evento: catálogo WAVE 1 (`quality`, `safety`, …) — máx. 7 valores.
- Sem labels de `user_id` nas métricas exportadas.

## 5. OTLP strategy

| Flag | Default |
|------|---------|
| `IMPETUS_OTEL_EXPORTER_ENABLED` | `false` |
| `IMPETUS_OTEL_ENDPOINT` | (vazio) |
| `IMPETUS_OTEL_EXPORT_INTERVAL_MS` | `15000` |
| `IMPETUS_OTEL_EXPORT_BATCH_SIZE` | `50` |

- Export **HTTP JSON** OTLP-compatible (`/v1/traces`, `/v1/metrics`) via `fetch` nativo — sem dependência OpenTelemetry SDK no hot path.
- Buffer em memória com cap; drop oldest on overflow.
- Falhas de export: log estruturado `[OTEL_EXPORT_FAIL]` — nunca bloqueia request.

## 6. Rollout plan

1. Deploy com `IMPETUS_OBSERVABILITY_V2_ENABLED=false` (zero overhead).
2. Staging: `IMPETUS_OBSERVABILITY_V2_ENABLED=true` + sub-flags individuais.
3. `IMPETUS_WORKFLOW_TRACING_ENABLED=true` — validar propagação headers.
4. `IMPETUS_PROMETHEUS_ENDPOINT_ENABLED=true` (rede interna) — scrape `/api/internal/observability/metrics`.
5. `IMPETUS_OTEL_EXPORTER_ENABLED=true` + endpoint Tempo/Jaeger staging.
6. SLO/alertas: 7 dias observe-only antes de paging.

## 7. Alert strategy (estrutura, sem paging externo)

Regras em `alertEvaluator.js` — emitem `[OBS_ALERT]` NDJSON:

| Alerta | Condição | Severidade |
|--------|----------|------------|
| `SLO_BURN_CRITICAL` | burn_rate > 2.0 por 5 min | critical |
| `SATURATION_HIGH` | saturation > 0.85 | high |
| `OUTBOX_LAG_HIGH` | p95 lag > 30s | high |
| `DLQ_GROWTH` | dlq depth delta > 10/min | high |
| `COGNITIVE_PRESSURE_CRITICAL` | pressure > 0.8 | critical |

Modo default: **observe** (log only). `IMPETUS_OBSERVABILITY_ALERTS_ENFORCE=false`.

## 8. Fallback plan

- `IMPETUS_OBSERVABILITY_V2_ENABLED=false` → comportamento idêntico ao pré-WAVE 2.
- OTLP off → métricas/traces permanecem in-memory (`enterpriseObservabilityRuntime` intacto).
- Falha OTLP → auto-disable export por 5 min (circuit breaker in-memory).
- Sem migration SQL obrigatória nesta wave.

## 9. Gate W2→W3

- Prometheus scrape estável 7 dias.
- OTLP recebe >95% batches em staging.
- Cardinality audit: < 500 séries activas.
- 1 drill de alerta sem falso positivo.

## 10. Módulos entregues

| Módulo | Caminho |
|--------|---------|
| Flags | `src/observability/observabilityFlags.js` |
| Correlation | `src/observability/correlationContext.js` |
| Workflow tracing | `src/observability/workflowTracingService.js` |
| Tenant metrics | `src/observability/tenantMetricsRegistry.js` |
| SLO/SLI | `src/observability/sloSliRegistry.js` |
| Saturation | `src/observability/saturationMonitor.js` |
| Event lag | `src/observability/eventLagMonitor.js` |
| DLQ monitor | `src/observability/dlqMonitor.js` |
| Workflow obs | `src/observability/workflowObservability.js` |
| Cognitive pressure | `src/observability/cognitivePressureObservability.js` |
| OTLP | `src/observability/otlpExporter.js` |
| Alerts | `src/observability/alertEvaluator.js` |
| Runtime | `src/observability/enterpriseObservabilityV2Runtime.js` |
