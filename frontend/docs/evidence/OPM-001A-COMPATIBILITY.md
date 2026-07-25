# OPM-001A — Compatibility

**Entrega:** OPM-001A  
**Data:** 2026-07-19

---

## Superfícies certificadas — inalteradas

| Superfície | Status |
|------------|--------|
| Backend / APIs WMS-003 | ✅ Intacto |
| APIs Supply | ✅ Intacto |
| Runtime / CC | ✅ Intacto |
| RBAC (`wmsRbacNavigation`) | ✅ Intacto — verificação permanece no frame |
| Feature Flags | ✅ Intacto |
| Rotas `/app/logistics/*` | ✅ Intacto |
| NAV-001 / Sidebar | ✅ Intacto |
| GF / ARC / REV | ✅ Intacto |
| WMS-007A gate & pages | ✅ Intacto — adapter only |

---

## Compatibilidade WMS standalone

| Módulo | Page | Frame | Hook API |
|--------|------|-------|----------|
| Warehouses | `WarehouseModulePage` | `WmsStandaloneModuleFrame` | `listWarehouses` |
| Inventory | `InventoryModulePage` | idem | `listItems` |
| Receiving | `ReceivingModulePage` | idem | `listReceiving` |
| Picking | `PickingModulePage` | idem | `listPicking` |
| Shipping | `ShippingModulePage` | idem | `listShipping` |
| Transfers | `TransferModulePage` | idem | `listTransfers` |

Props do frame **inalteradas**: `moduleId`, `title`, `description`, `columns`, `rows`, `loading`, `error`, `reload`, `phase`.

---

## Atributos DOM preservados

- `data-wms-module` — wrapper frame
- `data-wms-standalone="true"` — wrapper frame
- `data-wms-phase` — wrapper frame
- `data-industrial-module` — layout OPM-001A
- `data-industrial-state` — banners de estado
- `data-industrial-cognitive` — placeholders IA

---

## Comportamento funcional preservado

| Comportamento | Antes WMS-007A | Após OPM-001A |
|---------------|----------------|---------------|
| RBAC negado | `WmsModulePermissionDenied` | Igual |
| Loading | `WmsModuleLoading` | `IndustrialModuleStateView` (equivalente visual) |
| Erro | `WmsModuleError` + classifier | `IndustrialModuleStateView` + classifier |
| Empty | `WmsModuleEmpty` | `IndustrialModuleStateView` empty |
| Dados | `WmsDataTable` | `IndustrialDataGrid` (sort + paginação + seleção) |
| Refresh | Botão toolbar | Botão toolbar industrial (mesmo `reload()`) |

---

## Supply / outros domínios

- `SupplyWorkspacePage` — **não alterado** (shell homologação)
- Framework disponível para adopção em OPM-008+ sem breaking changes

---

## Regressão

Todos os testes certificados executados com sucesso — ver `OPM-001A-TEST-REPORT.md`.
