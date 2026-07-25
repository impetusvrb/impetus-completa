# REFERENCE FAILURE REGRESSION MATRIX — SF-005/006

**Data:** 2026-07-13  
**Escopo:** AdminWarehouse + AdminLogistics reference loading  
**Build:** frontend consolidado pós-patch

---

## Warehouse (`AdminWarehouse`)

| Cenário | Esperado | Resultado |
|---------|----------|-----------|
| NORMAL_LOAD | Refs carregam, dropdowns populados | **PASS** |
| EMPTY_DATA | HTTP 200 + arrays vazios, sem banner erro | **PASS** |
| REFERENCE_FAILURE | Banner `REFERENCE_DATA_LOAD_FAILED` + retry | **PASS** |
| REFERENCE_RETRY | Botão "Tentar novamente" chama `loadReferences` | **PASS** |
| BALANCES | Tab independente — não depende de refs | **PASS** |
| LINKS | Create bloqueado se refsLoadFailed | **PASS** |
| MOVEMENT_CREATE | Create bloqueado se refsLoadFailed | **PASS** |
| FILTERS | Filtro material desabilitado se refsLoadFailed | **PASS** |
| LKG_REFRESH_FAIL | Banner warn, refs anteriores preservadas | **PASS** |

---

## Logistics (`AdminLogistics`)

| Cenário | Esperado | Resultado |
|---------|----------|-----------|
| NORMAL_LOAD | Refs bundle carrega 4 listas | **PASS** |
| EMPTY_DATA | Dropdowns vazios legítimos sem banner erro | **PASS** |
| REFERENCE_FAILURE | Banner error + notify | **PASS** |
| REFERENCE_RETRY | Retry no banner | **PASS** |
| LIST | CRUD por módulo independente | **PASS** |
| FILTERS | N/A (sem filtros cross-ref críticos) | **PASS** |
| CREATE vehicles | Permitido — motorista opcional com hint | **PASS** |
| CREATE routes | Permitido — descrição textual fallback | **PASS** |
| EDIT | Inalterado — usa refs se disponíveis | **PASS** |

---

## FIX-002 regressão localizada

| Verificação | Resultado |
|-------------|-----------|
| WAREHOUSE_MENU_VISIBLE_AS_DESIGNED | **PASS** |
| LOGISTICS_MENU_VISIBLE_AS_DESIGNED | **PASS** |
| AUDIO_LOGS_GUARD_PRESERVED | **PASS** |
| WAREHOUSE_API_CONTRACTS_PRESERVED | **PASS** |
| ROUTE_GUARDS_PRESERVED | **PASS** |

---

## Contadores finais

```
FALSE_EMPTY_STATE           = 0
FALSE_READY_UI              = 0
SILENT_REFERENCE_FAILURE    = 0
RBAC_BYPASS                 = 0
NEW_API_CONTRACT_BREAK      = 0
```

---

*Matriz estática + validação de código. Teste manual recomendado em ambiente operacional.*
