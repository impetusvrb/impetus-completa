# OPM-007 — Compatibility Report

**Fase:** OPM-007  
**Data:** 2026-07-19

---

## Baselines preservados

| Baseline | Status |
|----------|--------|
| BASELINE-SYSTEM v1.4 | ✅ Sem alterações |
| ARC-001 / ARC-002 / ARC-003 / ARC-003A | ✅ EOX breadcrumb estendido |
| NAV-001 / NAV-002 / NAV-002A | ✅ Nova rota standalone |
| OPM-001D | ✅ Registo baseline +1 módulo |
| OPM-002A – OPM-006 | ✅ Contratos operacionais intactos |
| OPM-E2E-001 | ✅ Sequência receipt→pick→issue inalterada |
| OPM-GOV-001 | ✅ Handoffs não modificados |
| WMS-REF-001 | ✅ Reutilização obrigatória |
| WMS-003 APIs | ✅ Apenas GET / list |

---

## Alterações aditivas

| Área | Alteração |
|------|-----------|
| `wmsModuleRegistry.js` | Entrada `warehouse_intelligence` |
| `WmsLogisticsStandaloneRoutes.jsx` | Rota `warehouse-intelligence` |
| `eoxRegistry.js` | `LOGISTICS_MODULE_PHASES.warehouse_intelligence = OPM-007` |
| `wmsRbacNavigation.js` | Permissão `warehouse.read` |
| `opm001dOperationalBaselineRegistry.js` | Módulo certificado OPM-007 |
| `inventoryIntegrationContracts.js` | `warehouseIntelligence.status: active` |

---

## Módulos operacionais — zero regressão

Receiving · Inventory · Picking · Shipping · Transfer — páginas, hooks e integrações **não alterados** nesta fase.

Testes de certificação OPM-003–006 e OPM-E2E-001 reexecutados via `test:opm-logistics`.

---

## Camada analítica — isolamento

- Sem imports de `createMovement`, `completeTransfer`, `dispatchShipping`, etc.
- Foundation hook limitado a `list*` e `warehouseCapacity`
- Recomendações com `action: informativo` apenas

---

## GAPs conhecidos

| ID | Descrição | Fase alvo |
|----|-----------|-----------|
| WI-GAP-001 | API agregada `GET /v1/warehouse/intelligence` | OPM-008 |
| WI-GAP-002 | Mapas gráficos heatmap | OPM-008+ |

Ver `wiGapRegistry.js`.
