# ECO-07 — Executive Insights Consumer Adapter

**Fase:** 7 · **Data:** 2026-07-02 · **ADR:** ADR-ECO-003

---

## Ficheiro

`backend/src/services/governanceAdapters/executiveInsightsConsumerAdapter.js`

---

## Fluxo

```text
Executive Dashboard
        ↓
executiveInsightsConsumerAdapter.processExecutiveDashboard
        ↓
governanceExecutiveInsightsService.buildExecutiveDashboard (read-only)
        ↓
Dashboard enriquecido (consumer) ou shadow compare (OFF)
```

---

## API interna

| Função | Descrição |
|--------|-----------|
| `inferParallelExecutiveKpis(context)` | KPIs paralelos legados (pulse proxy, strategic) |
| `consumeExecutiveInsights(companyId)` | KPIs certificados read-only |
| `compareShadow(parallel, governance)` | Compara 5 KPIs + trend |
| `extractOwnPreserved(context)` | domain_states, cross_domain, strategic local |
| `processExecutiveDashboard(companyId, context)` | Entry point shadow/consumer |

---

## KPIs certificados

- `governanceMaturityIndex`
- `operationalStabilityIndex`
- `policyEfficiencyIndex`
- `continuousImprovementIndex`
- `governanceEvolutionTrend`

---

## Flag

`ECO_EXECUTIVE_VIA_EG` — serviço `ecoExecutiveFlags.js`

| Valor | Modo |
|-------|------|
| `false` | Shadow — sem substituir KPIs visíveis |
| `true` | Consumer — `executive_kpis` de EG |

---

## Garantias

- `recalculated: false` no payload governance
- Não altera `governanceExecutiveInsightsService.js`
- Rollback independente de ECO-03…06
