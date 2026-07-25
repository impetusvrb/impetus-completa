# FIN-AUD-001 — Module Map

**Fonte:** `frontend/src/platform/audit/finance/finAud001ModuleMap.js`

---

## Módulos identificados

| moduleId | Tipo | Rotas | Maturidade | Visibilidade |
|----------|------|-------|------------|--------------|
| financial_intelligence | contextual_module | `/app/centro-custos-industriais`, `/app/mapa-vazamento-financeiro` | complete | registered |
| cost_center | contextual_module | `/app/admin/centro-custos` | complete | registered |
| losses_map | contextual_module | `/app/mapa-vazamento-financeiro` | partial | registered |
| centro_previsao_operacional | contextual_module | `/app/centro-previsao-operacional` | partial | registered |
| nexus_billing_admin | admin_module | `/app/admin/nexusia-custos` | complete | route_only |
| finance_native | planned_domain | `/app/finance` | placeholder | eox_inactive |
| centro_comando_finance_widgets | dashboard_widgets | layout finance_management | partial | profile_gated |

---

## Módulos ocultos / experimentais / incompletos

- **finance_native** — EOX inactive, sem `domains/finance`
- **losses_map** — API financial-leakage gap
- **centro_previsao_operacional** — cross-domain forecasting
- **centro_comando_finance_widgets** — widgets dispersos no Centro Comando

---

## Registry contextual

`backend/src/contextualModules/moduleRegistry.js` — categoria `financial`:

- `financial_intelligence`
- `cost_center`
- `losses_map`

Unlock por `area: finance` em `moduleCapabilities.js`.

---

## UI components mapeados

CentroCustosExecutivo, CentroCustosAdmin, MapaVazamentoFinanceiro, NexusIACustos, WidgetCentroCustos, WidgetMapaVazamentos, WidgetGraficoCustosSetor, WidgetGraficoMargem, WidgetDesperdicio.
