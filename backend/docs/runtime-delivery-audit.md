# Phase Z.15 — Runtime Delivery Audit & Governance Trace

Auditoria completa do pipeline de delivery (módulos, sidebar, KPIs, summaries) **sem** nova foundation cognitiva.

## Pacote

`backend/src/runtimeDeliveryAudit/`

## Payload aditivo

- `delivery_governance_trace` em `/dashboard/me`, `/dashboard/kpis`, `/dashboard/smart-summary`
- `delivery_pipeline_report` em `/dashboard/me`

## API interna

`/api/internal/runtime-delivery-audit/`

| Endpoint | Função |
|----------|--------|
| GET /status | Flags e fase |
| GET /sidebar | Trace sidebar |
| GET /kpis | Trace KPIs |
| GET /summaries | Trace narrativa |
| GET /legacy | Catálogo injectors |
| GET /pipeline | Ordem canónica vs real |
| GET /reinjection | Pontos de reinjection |
| GET /report | Relatório consolidado |

## Flags

| Flag | Default |
|------|---------|
| IMPETUS_RUNTIME_DELIVERY_AUDIT | off |
| IMPETUS_RUNTIME_PIPELINE_TRACE | off |
| IMPETUS_RUNTIME_DELIVERY_OBSERVABILITY | **on** |

## Hardening (Z.15)

- `isModuleReinjectionBlocked` — módulos negados nunca voltam
- `enforceSingleSourceOfTruth` — `final_visible_modules` quando governance_applied
- Filtro de `contextual_modules` no backend

## Testes

```bash
npm run test:runtime-delivery-audit
```
