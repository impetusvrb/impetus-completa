# OPS-001 — RBAC Validation

**Perfil homologado (WMS-003):** Gerente de Almoxarifado, Expedição e Logística  
**Profile code:** `warehouse_manager`

---

## Permissões WMS-004

| Permissão | Concedida | Estado |
| --- | --- | --- |
| warehouse.read | YES | ✅ PASS |
| inventory.read | YES | ✅ PASS |
| receiving.execute | YES | ✅ PASS |
| picking.execute | YES | ✅ PASS |
| shipping.execute | YES | ✅ PASS |
| transfer.execute | YES | ✅ PASS |

## Checks

| Check | Estado | Observado | Esperado / Nota |
| --- | --- | --- | --- |
| profile_definition | ✅ PASS | warehouse_manager | warehouse_manager |
| profile_activated | ✅ PASS | true | true |
| all_wms_modules | ✅ PASS | 6 | 6 |
| rbac_blocks_workspace | ✅ PASS | false | RBAC não bloqueia warehouse_manager — bloqueio é Feature Flag |

**Conclusão RBAC:** O perfil `warehouse_manager` possui todas as permissões WMS-003. A ausência do workspace **não** é causada por RBAC.

**Classificação RBAC:** ✅ PASS
