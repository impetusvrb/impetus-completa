# SF-005 — Admin Warehouse — Reference Failure Recovery

**Data:** 2026-07-13  
**Missão:** SF-005/006 — WAREHOUSE & LOGISTICS REFERENCE FAILURE RECOVERY  
**Módulo:** `frontend/src/pages/AdminWarehouse.jsx`

---

## Critérios de aceite

```
SF_005_STATUS                    = PASS
ROOT_CAUSE_IDENTIFIED            = YES
WAREHOUSE_SILENT_REFERENCE_FAILURE = 0
EMPTY_VS_FAILED                  = DIFFERENTIATED
FALSE_EMPTY_STATE_RISK           = MITIGATED
FALSE_READY_UI_RISK              = MITIGATED
REFERENCE_RETRY                  = VALIDATED
LAST_KNOWN_GOOD_STATE            = PRESERVED_WHEN_SAFE
WAREHOUSE_FIX_002                = PRESERVED
SENSITIVE_DATA_LOGGED            = NO
LOG_VOLUME_RISK                  = CONTROLLED
```

---

## 1. Silent failure identificado (pré-fix)

| # | Linha | Função | Operação | API | Classificação |
|---|-------|--------|----------|-----|---------------|
| 1 | 71-72 | `loadReferences` | `adminWarehouse.getReferences()` | `GET /admin/warehouse/references` | **SILENT_FAILURE** |

**Comportamento anterior:** `catch` com `console.error` apenas — `references` permanece `null`.

---

## 2. Referências carregadas

| Campo | Classificação | Uso |
|-------|---------------|-----|
| `categories` | REQUIRED_FOR_MUTATION | MaterialsModule dropdown |
| `suppliers` | REQUIRED_FOR_MUTATION | MaterialsModule dropdown |
| `locations` | REQUIRED_FOR_MUTATION / FILTER_ONLY | Materials, Movements |
| `materials` | REQUIRED_FOR_MUTATION | Movements, Links, filtros |
| `processes` | OPTIONAL_METADATA | LinksModule |
| `productionLines` | OPTIONAL_METADATA | LinksModule |
| `assets` | OPTIONAL_METADATA | LinksModule |
| `departments` | OPTIONAL_METADATA | LinksModule |

**Sub-módulos independentes de refs:** Categorias, Fornecedores, Localizações, Parâmetros, Saldos (CRUD próprio).

---

## 3. Risco operacional (pré-fix)

| Cenário | UI enganosa |
|---------|-------------|
| API refs falha | Dropdowns vazios — parece **NO_REFERENCE_DATA** |
| Materials create | Formulário abre sem categorias/fornecedores |
| Movements create | Filtro material vazio + modal sem materiais |
| Links create | Modal sem materiais/processos |

**PARTIAL_UI_FALSE_READY = TRUE** (pré-fix)

---

## 4. Correção aplicada

| Alteração | Detalhe |
|-----------|---------|
| `resolveAdminApiError` | Mensagem segura canónica FIX-003/004 |
| `refsError` | Falha inicial — banner error + `notify.error` |
| `refsStaleError` | Refresh falha com LKG — banner warn |
| `referencesRef` | Preserva last known good — não faz `setReferences(null)` em refresh falhado |
| Banner + retry | `REFERENCE_DATA_LOAD_FAILED` + botão "Tentar novamente" |
| MaterialsModule | Bloqueia create quando `refsLoadFailed` |
| MovementsModule | Bloqueia create/filtro material quando `refsLoadFailed` |
| LinksModule | Bloqueia create quando `refsLoadFailed` |
| CSS | `.admin-ref-banner` em `AdminWarehouse.css` |

---

## 5. Estados diferenciados

| Estado | Condição | UI |
|--------|----------|-----|
| `REFERENCE_DATA_EMPTY` | HTTP 200 + arrays vazios | Dropdowns vazios sem banner de erro |
| `REFERENCE_DATA_LOAD_FAILED` | timeout / network / 5xx | Banner error + retry |
| LKG stale | Refresh falha com refs válidas | Banner warn + dados anteriores preservados |

---

## 6. FIX-002 preservado

| Item | Status |
|------|--------|
| Menu Warehouse visível | ✅ intacto (`Layout.jsx`) |
| Contratos `balances`, `links`, `movements.create` | ✅ intactos (`api.js`) |
| Tabs Saldos / Vínculos / Movimentações | ✅ não alterados (contratos) |
| Route guards | ✅ AdminRouteGuard inalterado |

---

## 7. Ficheiros alterados

| Ficheiro | Alteração |
|----------|-----------|
| `frontend/src/pages/AdminWarehouse.jsx` | Error recovery refs + gates locais |
| `frontend/src/pages/AdminWarehouse.css` | Banners SF-005/006 |

---

*Evidência gerada sem alteração à cadeia forense P0.*
