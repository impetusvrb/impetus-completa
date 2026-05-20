# Fase X — Runtime Data Integrity & Operational Enrichment — Implementação

## Objetivo

Consolidar **sinais operacionais reais**, medir **densidade contextual** e detectar **gaps de telemetria** — sem inventar dados nem alterar UX.

---

## Arquitetura

```
Canais: /dashboard/me | /kpis | /smart-summary | /chat
        │
        ▼
runtimeEnrichmentFacade.enrichWithRuntimeDataIntegrity
        ├── runtimeOperationalEnrichmentEngine
        ├── enrichmentPipelineCoordinator (por canal)
        ├── contextualDataDensityEngine
        ├── operationalSignalIntegrityAnalyzer
        ├── runtimeTelemetryGapDetector
        ├── dashboardSemanticEnrichmentEngine
        ├── insightGenerationIntegrityEngine
        ├── contextualEnrichmentValidator
        └── operationalNarrativeEnrichmentEngine
```

---

## Feature flags

| Variável | Default |
|----------|---------|
| `IMPETUS_RUNTIME_ENRICHMENT` | **off** |
| `IMPETUS_OPERATIONAL_SIGNAL_ANALYSIS` | **off** |
| `IMPETUS_CONTEXTUAL_DENSITY_ENGINE` | **off** |
| `IMPETUS_DASHBOARD_ENRICHMENT` | **off** |
| `IMPETUS_TELEMETRY_GAP_DETECTION` | **off** |
| `IMPETUS_RUNTIME_ENRICHMENT_OBSERVABILITY` | **on** |

---

## API interna

`/api/internal/runtime-enrichment`

| GET | Rota |
|-----|------|
| | `/status` |
| | `/density` |
| | `/signals` |
| | `/telemetry` |
| | `/insights` |
| | `/dashboards` |
| | `/enrichment` |
| | `/report` |

---

## Blocos JSON (todos os canais)

- `runtime_enrichment`
- `operational_density`
- `enrichment_integrity`
- `telemetry_integrity` (onde aplicável)
- `semantic_enrichment`
- `operational_signal_quality`

---

## Eventos

`LOW_OPERATIONAL_DENSITY_DETECTED`, `WEAK_OPERATIONAL_SIGNAL_DETECTED`, `SEMANTICALLY_EMPTY_DASHBOARD_DETECTED`, `ORPHAN_METRIC_DETECTED`, `TELEMETRY_GAP_DETECTED`, `LOW_INSIGHT_UTILITY_DETECTED`, `STALE_ENRICHMENT_DETECTED`, `LOW_CONTEXTUAL_RICHNESS`, `RUNTIME_ENRICHMENT_INCONSISTENCY`

---

## Testes

```bash
npm run test:runtime-data-integrity
```

Snapshots: executive, director, coordinator, supervisor, operator, hr, financial, quality, environmental, safety, logistics, engineering, maintenance.

---

## Rollout

1. Observabilidade ON em produção  
2. Monitorizar `/report` e densidade por tenant  
3. Resolver gaps PLC/connector reais (não mascarar)  
4. Considerar enforcement apenas após validação humana  
