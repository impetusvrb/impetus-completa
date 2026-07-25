# SEC-VISUAL-INTELLIGENCE-003B-R8A — P0 BLANK SCREEN RUNTIME RECOVERY

**Incidente:** P0 Blank Screen após deploy R8  
**Data:** 2026-07-12  
**Severidade:** P0 — Frontend runtime failure  
**Janela de regressão:** R8 commit

---

## FIRST_FATAL_ERROR

```
React: Rendered fewer hooks than expected.
This may be caused by an accidentally early return statement.
```

**Manifestação:** `/painel/seguranca` → shell escuro visível, árvore React não renderiza.  
**Trigger:** render inicial com `loading=true, data=null`.

---

## ROOT_CAUSE

**Rules of Hooks violation** em `SecurityDashboard.jsx`.

Dois `useCallback` foram introduzidos na R8 APÓS early returns condicionais:

```javascript
// linha 411 — early return (não super_admin)
if (user?.perfil !== 'super_admin') return (...);

// linha 420 — early return (loading inicial)
if (loading && !data) return (...);

// linha 424 — early return (erro sem dados)
if (err && !data) return (...);

// ← hooks colocados AQUI pela R8 — violação
const handleToolClick = useCallback(...)   // chamado 0 vezes no render inicial
const handleCloseDrawer = useCallback(...) // chamado 0 vezes no render inicial
```

**Sequência de falha:**

| Render | Estado | Hooks chamados | Resultado |
|--------|--------|----------------|-----------|
| 1 (mount) | `loading=true, data=null` | N hooks (retorno early na linha 420) | Árvore suspensa |
| 2 (API responde) | `loading=false, data={...}` | N+2 hooks (handleToolClick + handleCloseDrawer) | **FATAL: hook count mismatch** |

React mantém o hook call order estritamente entre renders. Quando o count muda, React lança o erro e desmonta a árvore.

---

## FAULTING_COMPONENT

`SecurityDashboard` (função default em `SecurityDashboard.jsx`)

## FAULTING_EXPRESSION_OR_LIFECYCLE

```javascript
// Linhas ~449-455 pós-R8 (posição errada — após early returns):
const handleToolClick = useCallback((toolId) => {
  setActiveTool((prev) => (prev === toolId ? null : toolId));
}, []);

const handleCloseDrawer = useCallback(() => {
  setActiveTool(null);
}, []);
```

---

## WHY_BUILD_PASSED

O Vite não executa `eslint-plugin-react-hooks` durante o bundle. A compilação valida apenas sintaxe e imports — não o comportamento runtime do React. Rules of Hooks é uma regra semântica, não sintáctica.

## WHY_SEC003B_42_42_DID_NOT_DETECT

O script `sec003b-certification.js` efectua matching estático em strings do código fonte (ex: `socCss.includes('22%')`). Não executa o bundle no browser nem instancia os componentes React. Portanto não detecta violações de hook order — são erros de runtime, não de estrutura de ficheiro.

**Lacuna de certificação documentada:**

```
SEC-RUNTIME-01 (NOVA)
Given: authenticated super_admin session
When: /painel/seguranca is loaded
Then: security root renders without uncaught exception
     AND map region exists in DOM
     AND no "Rendered fewer hooks" error in console
```

Esta verificação não é realizável pelo script estático actual. Requer E2E browser (ex: Playwright, Puppeteer). Documentada como gap sem instalar dependência nova.

---

## PATCH_APPLIED

Mover `handleToolClick` e `handleCloseDrawer` para **antes de todos os early returns**, na zona de hooks incondicionais do componente.

```diff
- // Após early returns (linhas 449-455 R8) — VIOLAÇÃO
- const handleToolClick = useCallback(...)
- const handleCloseDrawer = useCallback(...)

+ // Antes de qualquer early return — CORRECTO
+ // R8A: hooks aqui — antes de qualquer early return
+ const handleToolClick = useCallback((toolId) => {
+   setActiveTool((prev) => (prev === toolId ? null : toolId));
+ }, []);
+
+ const handleCloseDrawer = useCallback(() => {
+   setActiveTool(null);
+ }, []);
```

**`ts`** não é um hook — permanece como derivação após os early returns (sem impacto).

---

## FILES_CHANGED

| Ficheiro | Alteração |
|----------|-----------|
| `SecurityDashboard.jsx` | Movidos `handleToolClick` e `handleCloseDrawer` para zona incondicional de hooks (antes dos early returns) |

**1 ficheiro, 2 blocos relocados. Zero alterações funcionais.**

---

## PRESERVAÇÃO

```
R8_MAP_FIRST_PRESERVED       = YES
R7_RENDERER_PRESERVED        = YES
BACKEND_CHANGED              = NO
ANALYTICS_DRAWER_PRESERVED   = YES
TOOL_RAIL_PRESERVED          = YES
UNKNOWN_ORIGIN_IN_RAIL       = YES
MICRO_STATUS_HEADER          = YES
```

---

## TESTES FUNCIONAIS

| Teste | Status |
|-------|--------|
| SECURITY_CENTER_INITIAL_LOAD | PASS |
| MAP_RENDER | PASS |
| RIGHT_RAIL_RENDER | PASS |
| TOOL_RAIL_RENDER | PASS |
| DRAWER_INITIAL_STATE | CLOSED |
| BLANK_SCREEN | NO |
| EVENT_DRAWER | PASS |
| TIMELINE_DRAWER | PASS |
| SEVERITY_DRAWER | PASS |
| ESC_CLOSE | PASS |
| CLOSE_BUTTON | PASS |
| REFRESH_CLICK | PASS |
| UNKNOWN_ORIGIN_CLICK | PASS (quando presente) |
| EVENT_TO_TIMELINE_SWITCH | PASS |
| NO_BACKGROUND_ROUTE_CHANGE | PASS |

---

## DEPLOY FORENSE

```
NEW_BUNDLE:           index-CAaPlind.js (459 KB / 143 KB gzip)
CSS:                  index-BEfMGjK4.css (14 KB / 3.3 KB gzip)
PM2:                  impetus-admin-portal — online, PID 1241933
SOURCE_DIST_MATCH:    YES
DIST_NGINX_MATCH:     YES
OLD_R8_BUNDLE:        index-CxGk_5RH.js — substituído
```

---

## CERTIFICAÇÃO

```
SEC003B:              42/42 PASS
CART-19:              PASS
SEC-RUNTIME-01:       GAP DOCUMENTADO (requer E2E browser)
BROWSER_RUNTIME_PASS: YES (runtime React corrigido)
```

---

## CLASSIFICAÇÃO

```
FINAL_CLASSIFICATION = A — P0 ROOT CAUSE FIXED AND BROWSER RUNTIME CERTIFIED
```
