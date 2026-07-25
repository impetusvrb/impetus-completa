# OPS-002 — RBAC Validation (Post-Rollout)

**Perfil piloto:** Gerente de Almoxarifado, Expedicao e Logistica (`warehouse_manager`)

---

| Perfil | WMS inventory | WMS picking | Supply PO | Estado | Notas |
| --- | --- | --- | --- | --- | --- |
| warehouse_manager (Gerente Almoxarifado/Expedição/Logística) | true | true | true | ✅ PASS | — |
| warehouse_supervisor | true | true | — | ✅ PASS | — |
| warehouse_operator | true | true | — | ✅ PASS | — |
| procurement (no undue WMS admin) | — | true | true | ✅ PASS | Operador WMS + supply limitado — sem escalação indevida |

**Sem acesso indevido:** YES  
**Classificacao:** ✅ PASS
