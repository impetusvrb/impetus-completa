# OPM-001B — Compatibility

**Data:** 2026-07-19

## Superfícies certificadas — inalteradas

| Superfície | Status |
|------------|--------|
| Backend / OCL / logistics_native | ✅ |
| APIs WMS-003 | ✅ |
| RBAC | ✅ canAccessWmsModule no módulo warehouse |
| Feature Flags | ✅ |
| Rotas / Sidebar / NAV-001 | ✅ |
| Centro Cognitivo | ✅ |
| OPM-001A framework | ✅ Sem alterações |
| WmsStandaloneModuleFrame | ✅ Inalterado |

## Módulos WMS

| Módulo | Presentation OPM-001B |
|--------|----------------------|
| **Warehouses** | WarehouseOperationalModule (OPM-001B) |
| Inventory | WmsStandaloneModuleFrame (OPM-001A adapter) |
| Receiving | idem |
| Picking | idem |
| Shipping | idem |
| Transfers | idem |

## Testes actualizados (evolução documentada)

- `runWms007aStandaloneTests.js` — warehouse usa foundation
- `runWms007ModulesTests.js` — warehouse exception OPM-001B
- `opm001aIndustrialModuleTests.mjs` — warehouse presentation branch

## Hook legado

`useWarehouseModule.js` permanece no repositório (não removido) para compatibilidade de referência; page usa `useWarehouseFoundation.js`.
