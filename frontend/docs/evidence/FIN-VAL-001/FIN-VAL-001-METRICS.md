# FIN-VAL-001 — Metrics & thresholds

**Fonte:** `platform/validation/finance/metrics/finValMetrics.js`

| Métrica | Limiar | Notas |
|---------|--------|-------|
| `twin_composition_ms_max` | 250 ms | Engine + Twin state (sync harness) |
| `hub_enrichment_ms_max` | 250 ms | Compose Hub + apply EI |
| `cost_divergence_ratio_max` | 2.5 | \|smart − industrial\| / industrial |
| `explainability_coverage_min` | 1.0 | 100% surfaces com evidence/trace |
| `observability_events_min` | 12 | Constantes `finance.*` obrigatórias |
| `resilience_soft_fail_required` | true | Degradação sem throw; sem Twin paralelo |

## Eventos de observabilidade (mín. 12)

Hub: `dashboard.loaded`, `kpi.opened`, `alert.opened`, `insight.clicked`, `decision.executed`  
2.1: `smart_costing.calculated`, `performance.updated`, `cost_analysis.completed`  
2.2: `twin.opened`, `twin.overlay.loaded`, `twin.node.selected`, `twin.financial_state.updated`

## Aceite

Findings `performance`, `consistency`, `explainability`, `observability`, `resilience` = PASS
