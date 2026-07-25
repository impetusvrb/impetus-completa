# SF-006 — Admin Logistics — Reference Failure Recovery

**Data:** 2026-07-13  
**Missão:** SF-005/006 — WAREHOUSE & LOGISTICS REFERENCE FAILURE RECOVERY  
**Módulo:** `frontend/src/pages/AdminLogistics.jsx`

---

## Critérios de aceite

```
SF_006_STATUS                    = PASS
ROOT_CAUSE_IDENTIFIED            = YES
LOGISTICS_SILENT_REFERENCE_FAILURE = 0
EMPTY_VS_FAILED                  = DIFFERENTIATED
FALSE_EMPTY_STATE_RISK           = MITIGATED
FALSE_READY_UI_RISK              = MITIGATED
REFERENCE_RETRY                  = VALIDATED
LAST_KNOWN_GOOD_STATE            = PRESERVED_WHEN_SAFE
LOGISTICS_FIX_002                = PRESERVED
SENSITIVE_DATA_LOGGED            = NO
LOG_VOLUME_RISK                  = CONTROLLED
```

---

## 1. Silent failure identificado (pré-fix)

| # | Linha | Função | Operação | API | Classificação |
|---|-------|--------|----------|-----|---------------|
| 1 | 77-78 | `loadReferences` | `Promise.all` vehicles/points/routes/drivers | 4× list endpoints | **SILENT_FAILURE** |

**Comportamento anterior:** `catch` com `console.error` apenas — `references` permanece `null`.

---

## 2. Referências carregadas

| Campo | API | Classificação | Uso |
|-------|-----|---------------|-----|
| `vehicles` | `GET /admin/logistics/vehicles` | CROSS_MODULE_REF | Disponível para futuros filtros |
| `points` | `GET /admin/logistics/points` | REQUIRED_FOR_MUTATION (UX) | RoutesModule origem/destino |
| `routes` | `GET /admin/logistics/routes` | CROSS_MODULE_REF | Metadados cruzados |
| `drivers` | `GET /admin/logistics/drivers` | OPTIONAL_METADATA | VehiclesModule motorista |

**Sub-módulos independentes:** Pontos e Motoristas têm `load()` próprio — CRUD funciona sem refs bundle.

---

## 3. Risco operacional (pré-fix)

| Cenário | UI enganosa |
|---------|-------------|
| Promise.all falha | Dropdown motoristas/pontos vazios |
| Routes create | Formulário parece operacional — selects origem/destino vazios |
| Vehicles create | Motorista dropdown vazio — parece "sem motoristas cadastrados" |

**PARTIAL_UI_FALSE_READY = TRUE** (pré-fix, Routes + Vehicles)

---

## 4. Correção aplicada

| Alteração | Detalhe |
|-----------|---------|
| `resolveAdminApiError` | Mensagem segura canónica |
| `refsError` / `refsStaleError` | Banners error vs warn |
| LKG via `referencesRef` | Preserva refs válidas em refresh falhado |
| Banner + retry | `REFERENCE_DATA_LOAD_FAILED` |
| VehiclesModule | Dropdown motorista mostra "Indisponível (falha refs)" + hint — create não bloqueado (motorista opcional) |
| RoutesModule | Dropdowns pontos com label explícito de falha + hint textual fallback |
| CSS | `.admin-ref-banner`, `.admin-ref-module-hint` (partilhado AdminWarehouse.css) |

---

## 5. Bloqueio localizado

| Módulo | Bloqueio |
|--------|----------|
| Veículos | ❌ Não bloqueia — motorista é opcional |
| Pontos | ❌ Não bloqueia — CRUD independente |
| Rotas | ❌ Não bloqueia módulo — permite descrição textual |
| Motoristas | ❌ Não bloqueia — CRUD independente |

---

## 6. FIX-002 preservado

| Item | Status |
|------|--------|
| Menu Logistics visível | ✅ intacto |
| DS header (sem `#1e88e5`) | ✅ intacto |
| Audio Logs guard | ✅ não tocado |
| Route guards | ✅ inalterados |

---

## 7. Ficheiros alterados

| Ficheiro | Alteração |
|----------|-----------|
| `frontend/src/pages/AdminLogistics.jsx` | Error recovery refs + hints locais |
| `frontend/src/pages/AdminWarehouse.css` | Banners partilhados |

---

*Evidência gerada sem alteração à cadeia forense P0.*
