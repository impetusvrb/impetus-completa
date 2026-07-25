# WMS-003 — RBAC

**Módulo:** `shared/wmsRbacDefinitions.js`  
**Middleware:** `requireWmsPermission(permission)`

---

## Permissões

| Permission | Capabilities requeridas |
|------------|----------------------|
| `warehouse.read` | wms:view, supervise, configure |
| `warehouse.write` | supervise, configure |
| `inventory.read` | wms:view, supervise, configure |
| `inventory.write` | supervise, configure |
| `receiving.execute` | execute_task, supervise, configure |
| `picking.execute` | execute_task, supervise, configure |
| `shipping.execute` | execute_task, supervise, configure |
| `transfer.execute` | execute_task, supervise, configure |

---

## Perfis

| Profile | Permissions |
|---------|-------------|
| warehouse_operator | read + execute |
| warehouse_supervisor | read + write + execute |
| warehouse_manager | all |

**Admin / hierarchy ≤ 1:** bypass total.

---

## Nota WMS-005

Navegação e activação prod permanecem para **WMS-005** — RBAC API funcional desde WMS-003.

*Teste:* `npm run test:rbac`
