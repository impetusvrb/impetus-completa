# ECO-07 — Observabilidade Executive Consumer

**Fase:** 7 · **Data:** 2026-07-02

---

## Endpoint

```
GET /api/audit/eco-executive/status
```

Resposta:
- `enabled` / `shadow_mode`
- `shadow_total`, `matches`, `divergences`
- `kpis_consumed`, `kpis_local`, `insights_reused`
- `dashboards_migrated`
- `avg_legacy_ms`, `avg_governance_ms`
- `adapter.dashboards_observed`, `adapter.certified_kpis`

---

## Métricas

| Métrica | Descrição |
|---------|-----------|
| `eco_executive_shadow_total` | Avaliações shadow |
| `eco_executive_shadow_match` | Matches KPI parallel vs EG |
| `eco_executive_shadow_divergence` | Divergências |
| `eco_executive_consumer_total` | Modo consumer |
| `eco_executive_insights_reused` | KPIs EG reutilizados |
| `eco_executive_kpis_consumed` | Total KPIs consumidos |
| `eco_executive_kpis_local` | Consultas KPI local |
| `eco_executive_dashboards_migrated` | Dashboards observados/migrados |
| `eco_executive_consumer_events` | Total eventos adapter |

---

## Campos registados

| Campo | Shadow | Consumer |
|-------|--------|----------|
| KPI compare (5 índices) | ✅ | — |
| executive_insights_shadow | ✅ | — |
| executive_kpis | — | ✅ |
| executive_own_preserved | ✅ | ✅ |
| dashboard_id | ✅ | ✅ |

---

## Dashboards integrados

| dashboardId | Integração |
|-------------|------------|
| `pulse_executive` | `pulseCognitiveService.getExecutiveDashboard` |
| `boardroom_z27` | `executiveCockpitConsolidationRuntime` |

---

## Critérios activação

| Critério | Threshold |
|----------|-----------|
| ECO-03…06 shadow match | ≥ 85% |
| ECO-07 KPI shadow match | ≥ 85% |
| Estabilidade | 7 dias |
