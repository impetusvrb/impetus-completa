# MANUIA ACTION SANITY CHECK — FIX-005 (localizado)

**Data:** 2026-07-13  
**Escopo:** Centro de Ação ManuIA apenas — **sem alterações de código ManuIA**  
**Ficheiro:** `frontend/src/features/manutencao-ia/ManuiaActionCenter.jsx` + handlers em `ManuIA.jsx`

---

## Inventário Centro de Ação

| ACTION | HANDLER | TARGET | PRECONDITION | VISIBLE | DISABLED | RESULT | CLASS |
|--------|---------|--------|--------------|---------|----------|--------|-------|
| Pesquisa | `goSearch()` | `activeTab='search'` + scroll `searchSectionRef` | Nenhuma | Sempre | Não | Navega para pesquisa | **PASS** |
| Ao vivo | `goLive()` | `activeTab='vision3d'` | Nenhuma | Sempre | Não | Abre Assistência ao Vivo | **PASS** |
| Upload | `goUpload()` | `vision3d` + `uploadTrigger++` | Nenhuma | Sempre | Não | Dispara upload na aba live | **PASS** |
| Código / QR | Modal → `handleQrSearch(code)` | Pesquisa com código | Input ≥2 chars | Sempre | Submit disabled se <2 | Inicia pesquisa automática | **PASS** |

---

## Ferramentas (MODULE_TABS) — navegação

| ACTION | HANDLER | PRECONDITION | CLASS |
|--------|---------|--------------|-------|
| Pesquisa (mobile stack) | `goSearch()` | — | **PASS** |
| Assistência ao Vivo (mobile) | `goLive()` | — | **PASS** |
| Demais tabs | `setActiveTab(id)` | — | **PASS** |
| Desktop tabs | `setActiveTab` / goSearch/goLive | Uma instância DOM (useIsMobileNav) | **PASS** |

---

## Achados fora de escopo

| ID | Achado | Status |
|----|--------|--------|
| — | Nenhum botão morto no Centro de Ação | — |
| FIX-015 | Stubs simulate/PO (backend ManuIA) | **NOT_AUTO_FIXED** — roadmap FIX-015 |

---

## Baseline preservada

```
MANUIA_TOOL_ORDER     = PRESERVED (MODULE_TABS inalterado)
MOBILE_DUPLICATION    = 0 (render condicional mantido)
SCROLL_REGRESSION     = 0 (goSearch scroll preservado)
CENTRO_DE_ACAO        = 4 tiles fixos
```

---

*Sanity check estático — protocolo visual MANUIA-UX-BASELINE-002 (viewports) recomendado em QA manual.*
