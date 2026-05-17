# Análise — QUALITY Navigation Runtime Stabilization

**Âmbito:** diagnóstico controlado (Fase 1 do hotfix). Sem alteração de arquitetura WAVE6 nem redesign.

## Fluxo de menu híbrido

1. **`Layout.jsx`** constrói `baseMenuItems` por papel (legacy).
2. **`buildHybridMenu`** (`contextualSidebarBuilder.core.cjs`): se `contextual_modules` não vier vazio, **insere** itens `_contextual` após `/app`, sem sobrescrever paths já ocupados pelo legacy.
3. **`mergeQualityPublicationIntoMenu`** (`qualityMenuPublicationEngine.js`): resolve `resolveQualityNavigationPublication` e **insere** itens `_quality_publication` após `/app`, com paths do manifest (incl. query `?view=`).
4. **`filterMenuByModules`** (`useVisibleModules.js`): aplica `visible_modules`, regras admin/universal, e trata `_quality_publication` via chave `quality_intelligence`.

Conclusão: o pipeline é **aditivo** por desenho; regressões de “perda de IA/Chat” tendem a vir de **filtro de módulos**, **chaves React duplicadas**, ou **runtime a falhar antes do Outlet**.

## Rotas QUALITY (App.jsx)

- Rota pai: `/app/quality/operational` → `QualityOperationalLayout` → `QualityRuntimePublicationGate` → `QualityOperationalShell` com **`renderOutlet`**.
- Filhas: `index`, `workspace`, `inspection`, `kiosk` — todas com `Suspense` + `Outlet` no shell.

## Resolução `?view=`

- **`QualityOperationalWorkspace`** lê `view` via `useSearchParams` e monta lazy hubs (governance, telemetry, cognitive, rollout).

## Causa raiz identificada (bloqueio de renderização)

Em **`QualityRuntimePublicationGate.jsx`**, o acesso a `assertQualityPublicationAccess` utilizava a variável **`user` sem declaração** (`ReferenceError` após `loading === false`). Isto derruba o subtrie React das rotas QUALITY (ecrã em branco / navegação inconsistente).

**Correção:** `const user = readUser();` antes do gate (ver hotfix).

## Riscos secundários corrigidos

| Risco | Efeito | Mitigação |
|-------|--------|-----------|
| `key={item.path}` com vários itens QUALITY | Colisão de keys / reconciliação estranha | `sidebarNavItemKey()` com `_quality_manifest_id` |
| `isActive` só por pathname | Item “Operacional” activo com `?view=` incorrecto | `isSidebarMenuItemActive(path, pathname, search)` |
| `dedupeMenuItemsByPath` só por string path | Colisão entre legacy e contextual com mesma norma | `dedupeSidebarMenuItems` com chave por `_module_id` / manifest id |
| Merge em excepção | Menu inteiro a desaparecer | `safeMergeQualityPublicationIntoMenu` + guard `ctx` nulo no merge |

## Publication guard

- **`assertQualityPublicationAccess`**: nega só com runtime operacional desligado, módulo `quality_intelligence` em falta, ou bloqueio explícito do servidor; com publication “legacy_operational_only” continua a permitir quando flags estritas estão off.

## Observabilidade assistiva (opt-in)

- `frontend/src/utils/qualityNavDebug.js`: logs `[QUALITY_PUBLICATION_RUNTIME]` / `[QUALITY_ROUTE_RESOLUTION]` quando `sessionStorage IMPETUS_QUALITY_NAV_LOG=1` ou `window.__IMPETUS_QUALITY_NAV_LOG`.

## Ficheiros relevantes (audit trail)

- `frontend/src/components/Layout.jsx`
- `frontend/src/hooks/useVisibleModules.js`
- `frontend/src/utils/contextualSidebarBuilder*.js` / `.cjs`
- `frontend/src/domains/quality/navigation/qualityMenuPublicationEngine.js`
- `frontend/src/domains/quality/navigation/QualityRuntimePublicationGate.jsx`
- `frontend/src/domains/quality/navigation/qualityRuntimePublicationGuard.js`
- `frontend/src/domains/quality/routes/QualityOperationalLayout.jsx`
- `frontend/src/domains/quality/operational-runtime/QualityOperationalShell.jsx`
- `frontend/src/App.jsx` (rotas aninhadas — **não alteradas** neste hotfix)
