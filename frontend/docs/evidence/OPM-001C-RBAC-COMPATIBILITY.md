# OPM-001C — RBAC Compatibility

**Data:** 2026-07-19

## Backend WMS-003 (inalterado)

| Permissão | Endpoint |
|-----------|----------|
| `warehouse.read` | GET warehouses, locations, capacity |
| `warehouse.write` | POST /warehouses |

## Frontend — espelho local (OPM-001C)

| Perfil | Leitura | Criação |
|--------|---------|---------|
| warehouse_operator | ✅ | ❌ |
| warehouse_supervisor | ✅ | ✅ |
| warehouse_manager | ✅ | ✅ |
| admin / hierarchy ≤ 1 | ✅ | ✅ |

Implementação: `warehouseOperationsRbac.js` — **não altera** `wmsRbacNavigation.js` certificado.

## Validação pré-operação

`assessWarehouseOperation()` verifica:

1. Feature Flags (`logistics_enabled`, `wms_operational_enabled`)
2. RBAC (`canWriteWarehouse()`)
3. Disponibilidade API / GAP registry

## Testes

```bash
npm run test:rbac-regression   # frontend + backend WMS-003 RBAC
```

**5 passed** (backend) + **1 passed** (frontend operations mirror)
