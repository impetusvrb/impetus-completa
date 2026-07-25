# OPM-002A — Relatório de Compatibilidade

**Reference Module:** Inventário  
**Baseline:** OPM-001D  
**Data:** 2026-07-19

---

## Verificações de compatibilidade

| Área | Status | Evidência |
|------|--------|-----------|
| Architecture Freeze respeitado | ✅ | Zero alterações em ARC/NAV/EOX core |
| APIs WMS-003 exclusivas | ✅ | `useInventoryFoundation` — listItems/Balances/Movements/Warehouses |
| EOX aderência | ✅ | `InventoryExport` → `EoxActionBar` |
| OPM-001A framework | ✅ | `IndustrialModuleLayout` + grid/search states |
| RBAC WMS | ✅ | `canAccessWmsModule('inventory')` |
| Regressão Warehouse (OPM-001C) | ✅ | `WarehouseOperationalModule` inalterado |
| Regressão módulos genéricos | ✅ | Receiving/Picking/Shipping/Transfer → `WmsStandaloneModuleFrame` |
| Regressão ARC-003A | ✅ | Outlet context preservado |
| Regressão OPM-001D | ✅ | Baseline registry intacto |
| Build frontend | ✅ | `npm run build` |

---

## Componentes congelados — diff zero

- `presentation/eox/*` (excepto consumo via import)
- `presentation/operational-navigation/*`
- `certification/opm001dOperationalBaselineRegistry.js`
- `backend/*`

---

## Alterações aditivas OPM-002A

- `modules/inventory/components/` — biblioteca Reference Module
- `modules/inventory/wmsReferenceModulePattern.js`
- Extensão aditiva `IndustrialDataGrid.onSortChange` (callback opcional)

---

## Risco de regressão

**Baixo** — escopo limitado ao domínio Inventário; módulos WMS restantes permanecem em frame genérico até OPM-003+.
