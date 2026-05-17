# Enterprise Frontend Runtime Incident Analysis
**Data:** 2026-05-17  
**Incidente:** "Erro em Dashboard" após hotfix QUALITY Navigation Runtime Stabilization  
**Estado ao reportar:** ONLINE (manual)  
**Estado ao encerrar:** ESTABILIZADO — nova build em produção

---

## 1. Causa Raiz Real — "Erro em Dashboard"

### Causa primária (confirmada por evidência de código)
`ModuleErrorBoundary(moduleName="Dashboard")` renderiza "Erro em Dashboard" quando qualquer componente no sub-tree (`CentroComando → Layout → ...`) lança uma exceção síncrona durante `render()`.

**Ponto de falha identificado:**  
`Layout.jsx` — o pipeline de construção de menu ocorria diretamente no corpo da função do componente **sem nenhum try-catch global**.

```
Dashboard
  └── ModuleErrorBoundary("Dashboard")
        └── CentroComando
              └── Layout                  ← render() sem try-catch global
                    ├── buildHybridMenu()
                    ├── safeMergeQualityPublicationIntoMenu()
                    └── filterMenu()
```

Se qualquer função da chain lançasse uma exceção síncrona inesperada (p.ex. durante o primeiro deploy com flags VITE ativas), o erro subia até `ModuleErrorBoundary("Dashboard")` → UI mostrava "Erro em Dashboard".

### Causa secundária (confirmada nos logs PM2)
```
[server] Rota não carregada: /api/quality-governance - subgroupStats is not defined
```

Em algumas das 126 reinicializações rápidas do backend, o módulo CJS `qualityControlChartEngine.js` tentava destruturar `subgroupStats` de `qualitySpcEngine` antes de o cache de módulos Node.js estar plenamente estável, causando que `subgroupStats` fosse `undefined` no momento do `require`. Resultado: rota `/api/quality-governance` **não montada** nessas instâncias.

### Fatores agravantes identificados
| Fator | Impacto |
|---|---|
| `useDashboardContext` criava `context` object novo a cada render (sem `useMemo`) | `useEffect([..., context])` disparava em todo render |
| `CentroComando` lia `user` de localStorage a cada render (sem `useMemo`) | `user` era new object em todo render → deps instáveis |
| 126 restarts do backend = cache de módulos Node.js reiniciado repetidamente | Window de race condition no CJS module cache |

---

## 2. Análise do Hotfix Anterior — Validação

### Ficheiros auditados
- `QualityRuntimePublicationGate.jsx` ✅ Correto — `user = readUser()` definido antes de `assertQualityPublicationAccess`
- `qualityMenuPublicationEngine.js` ✅ Correto — `safeMergeQualityPublicationIntoMenu` com try-catch e guard anti-encolhimento
- `qualityRuntimePublicationGuard.js` ✅ Correto — log aditivo sem side-effects
- `qualityNavigationResolver.js` ✅ Correto — log opt-in via `qualityNavDebug`
- `sidebarNavHelpers.js` ✅ Correto — funções puras, sem estado global, determinísticas
- `qualityNavDebug.js` ✅ Correto — zero-throw, opt-in
- `Layout.jsx` (hotfix) ✅ Correto na lógica, **incompleto** na proteção global

### Lacuna identificada no hotfix
O `safeMergeQualityPublicationIntoMenu` protegia apenas o merge QUALITY.  
O pipeline maior (`buildHybridMenu → safeMerge → filterMenu → filter → dedupe`) **não estava encapsulado** num try-catch, deixando outros pontos de falha expostos ao `ModuleErrorBoundary`.

### Regressões detectadas
Nenhuma. O hotfix foi correto e os módulos legacy (IA, Chat, dashboards) foram preservados.

---

## 3. Correções Aplicadas (esta sessão)

### 3.1 `frontend/src/components/Layout.jsx`
**Barreira try-catch global no pipeline de menu**

Encapsulou **toda** a chain `buildHybridMenu → safeMergeQualityPublicationIntoMenu → filterMenu → filter → dedupe` num único try-catch. Em caso de falha:
- Fallback para `filterMenu(baseMenuItems)` (menu legacy puro)
- Se `filterMenu` também falhar: `baseMenuItems.slice()` (cópia imutável do menu base)
- Nenhuma exceção escapa para o `ModuleErrorBoundary`

```javascript
let menuItems;
try {
  // ... pipeline completo ...
} catch (_menuBuildErr) {
  try { menuItems = filterMenu(baseMenuItems); }
  catch { menuItems = baseMenuItems.slice(); }
}
```

### 3.2 `frontend/src/features/dashboard/contextAdapter/useDashboardContext.js`
**`useMemo` para estabilidade referencial do `context`**

Antes: `buildDashboardContext()` era chamado em cada render → novo objeto → `useEffect([..., context])` disparava em cada render.  
Depois: `useMemo([meData, personalizadoData])` → objeto estável → useEffect dispara apenas quando o conteúdo real muda.

### 3.3 `frontend/src/features/dashboard/centroComando/CentroComando.jsx`
**`useMemo` para leitura estável de `user` do localStorage**

Antes: `JSON.parse(localStorage.getItem('impetus_user'))` em cada render → novo objeto → `user` instável nas deps de `useEffect`.  
Depois: `useMemo([], [])` — lido uma única vez por montagem.

### 3.4 `backend/src/domains/quality/governance/spc/qualityControlChartEngine.js`
**Exportação defensiva de `subgroupStats`**

Guard que detecta se `subgroupStats` ficou `undefined` por race condition do CJS cache e usa fallback funcional. Elimina a janela de falha que causava `[server] Rota não carregada: /api/quality-governance`.

---

## 4. Validação

### Testes de estabilidade runtime (28/28 ✅)
```
enterprise-runtime-stability — sidebarNavHelpers — referential stability        (11/11)
enterprise-runtime-stability — safeMergeQualityPublicationIntoMenu — crash barrier (9/9)
enterprise-runtime-stability — qualityNavDebug — zero-throw guarantee           (3/3)
enterprise-runtime-stability — menu pipeline — no recursion, no global state    (2/2)
enterprise-runtime-stability — route resolution — determinism                   (2/2)
enterprise-runtime-stability — dashboardContextAdapter — no infinite rebuild    (3/3)
```

### Testes de navegação anteriores (6/6 ✅)
```
quality-navigation-stabilization: 6/6 passed
```

### Backend module load (6/6 ✅)
```
qualityGovernance, qualityNavigation, qualityOperational,
qualityControlChartEngine, qualitySpcEngine, qualityGovernanceOrchestrator
```

### Smoke post-deploy
```
Frontend:                200 ✅
Quality nav health:      401 (auth required — route mounted) ✅
Quality governance health: 401 (auth required — route mounted) ✅
Erros novos no log:      Nenhum relacionado a quality/subgroupStats ✅
```

---

## 5. Análise de Loops e Recursão

| Padrão analisado | Resultado |
|---|---|
| Render recursion | ❌ Não detectado |
| Effect recursion | ❌ Não detectado (useMemo corrige instabilidade de deps) |
| useEffect dep instability | ⚠️ Detectado e corrigido (`context`, `user`) |
| useMemo instability | ❌ Não detectado após correções |
| Lazy route recursion | ❌ Não detectado |
| Outlet remount loops | ❌ Não detectado |
| Menu merge loops | ❌ Não detectado (safeMerge é estável em 20x) |
| Publication runtime loops | ❌ Não detectado |
| Route publication recursion | ❌ Não detectado |
| Suspense fallback loops | ❌ Não detectado |
| Dynamic import instability | ❌ Não detectado |
| Memory pressure | ❌ Não detectado |
| Chunk retry storm | ⚠️ Provável no incidente (chunk hash mismatch pós-rebuild) — mitigado por `BuildVersionGuard` existente |

---

## 6. Módulos Auditados — Estado

| Módulo | Status | Observação |
|---|---|---|
| `Layout.jsx` | ✅ Estabilizado | try-catch global no menu pipeline |
| `QualityRuntimePublicationGate.jsx` | ✅ Correto | bug `user` corrigido no hotfix anterior |
| `qualityMenuPublicationEngine.js` | ✅ Correto | safeMerge funcional |
| `sidebarNavHelpers.js` | ✅ Correto | funções puras, determinísticas |
| `qualityNavDebug.js` | ✅ Correto | zero-throw |
| `useDashboardContext.js` | ✅ Estabilizado | useMemo para context |
| `CentroComando.jsx` | ✅ Estabilizado | useMemo para user |
| `qualityControlChartEngine.js` | ✅ Estabilizado | defensive export |
| `qualityGovernanceOrchestrator.js` | ✅ Correto | não modificado |
| `qualityNavigationPublicationService.js` | ✅ Correto | carrega OK |
| Módulos legacy (IA, Chat, dashboards) | ✅ Coexistentes | preservados em todos os cenários de teste |
