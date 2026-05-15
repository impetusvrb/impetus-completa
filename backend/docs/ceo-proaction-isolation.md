# CEO Executive Module Isolation — Pró-Ação

## Objetivo

Remover o módulo **Pró-Ação** (`proaction`) exclusivamente do perfil **CEO**, sem afetar o acesso universal dos demais perfis.

## Justificativa

- O módulo Pró-Ação é operacional/tático (registro de ações e propostas)
- O CEO consome síntese estratégica, não operação granular
- Manter acesso direto aumenta ruído cognitivo executivo
- Alinhamento com o princípio de **executive experience refinement**

## Pontos de Universalização Identificados (Auditoria)

| # | Arquivo | Mecanismo |
|---|---------|-----------|
| 1 | `backend/src/services/dashboardAccessService.js` | `UNIVERSAL_SAFE_ACCESS_MODULES` injectado em `getAllowedModules()` — 3 caminhos de retorno |
| 2 | `backend/src/contextualModules/moduleRegistry.js` | `proaction` declarado com `universal: true` no catálogo |
| 3 | `frontend/src/hooks/useVisibleModules.js` | `isUniversalSafeAccessPath('/app/proacao')` bypassa `filterMenuByModules` e `canAccessPath` |
| 4 | `frontend/src/components/Layout.jsx` | `MENUS.ceo` inclui `{ path: '/app/proacao' }` explicitamente |
| 5 | `frontend/src/App.jsx` | `UNIVERSAL_SAFE_ACCESS_CEO_PATHS` inclui `/app/proacao` no `CEORouteGuard` |

## Resolução do Perfil CEO

O perfil CEO é resolvido quando:
- `user.role === 'ceo'`
- `user.dashboard_profile === 'ceo_executive'`

Não existem outros aliases (chief_executive_officer, executive_ceo, admin_ceo).

## Implementação

### 1. Backend — `dashboardAccessService.js`

**Criado:** `CEO_DENIED_MODULES` — Set imutável com `['proaction']`.

**Criado:** `_applyCeoExclusions(modules, role)` — filtro deny-only que executa como estágio final de `getAllowedModules()`.

**Aplicado em 3 caminhos de retorno:**
- Após merge universal para utilizadores com permissões explícitas (linha 127)
- Após merge universal para liderança sem permissões (linha 108)
- No admin portal, a função não afeta (admin não é CEO)

**Porque este é o ponto mais seguro:** é o último estágio antes do retorno, depois de TODA composição (perfil + baseline + universal). Qualquer novo caminho de retorno futuro deverá chamar `_applyCeoExclusions` para manter a invariante.

### 2. Frontend — `useVisibleModules.js`

**Criado:** `CEO_DENIED_PATHS` — Set imutável com `['/app/proacao']`.

**Criado:** `_isCeoUser()` — verifica `role === 'ceo'` ou `profile === 'ceo_executive'` no localStorage.

**Modificado:** `isUniversalSafeAccessPath()` — retorna `false` para `/app/proacao` e sub-paths quando o utilizador é CEO. Todos os outros paths universais mantêm bypass.

**Impacto em cascata:** `filterMenuByModules()` e `canAccessPath()` passam a não tratar `/app/proacao` como universal para CEO.

### 3. Frontend — `Layout.jsx`

**Removido:** `{ path: '/app/proacao', icon: Target, label: 'Pró-Ação' }` de `MENUS.ceo`.

### 4. Frontend — `App.jsx`

**Removido:** `/app/proacao` de `UNIVERSAL_SAFE_ACCESS_CEO_PATHS`.

## O que NÃO foi alterado

- `moduleRegistry.js` — `proaction` continua `universal: true` no catálogo
- `UNIVERSAL_SAFE_ACCESS_MODULES` — continua com `proaction` na lista global
- Permissões globais do módulo
- Governance engine
- Policy runtime
- Orchestration
- Capabilities de outros perfis
- Nenhum CSS hide / frontend-only hide

## Ficheiros Alterados

1. `backend/src/services/dashboardAccessService.js`
2. `frontend/src/hooks/useVisibleModules.js`
3. `frontend/src/components/Layout.jsx`
4. `frontend/src/App.jsx`

## Ficheiros Criados

1. `backend/src/tests/executiveModuleIsolationScenarios.js`
2. `backend/docs/ceo-proaction-isolation.md`

## Resultados dos Testes

| Suite | Resultado |
|-------|-----------|
| `test:executive-module-isolation` | **64 passed, 0 failed** |
| `test:dashboard-governance` | **74 passed, 0 failed** |
| `test:contextual-domain-isolation` | **22 passed, 0 failed** |
| `test:live-dashboard-contextual` | **112 passed, 0 failed** |
| `test:universal-safe-access` | **62 passed, 0 failed** |

**Total: 334 testes, 0 falhas, 0 regressões.**

## Confirmação

> CEO executive dashboard isolation successfully consolidated.
