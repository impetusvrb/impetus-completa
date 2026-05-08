# IMPETUS — Frontend Audit (Phase 3)

Auditoria do frontend para suportar a transição controlada do Motor A para
o Motor B. Foco: identificar pontos de **acoplamento entre frontend e
regras de cargo/role/job_title**, e mapear caminho de desacoplamento sem
quebrar telas existentes.

---

## 1. Pontos onde o frontend decide layout por cargo

| Local | Linhas | Tipo | Risco |
|---|---|---|---|
| `frontend/src/features/dashboard/centroComando/LayoutPorCargo.js` | 1‑245 | **Hardcoded por cargo (Motor A no frontend)** — 8 branches `if (r === 'ceo' || r.includes('diretor'))` etc. com layouts fixos | ⚠️ Alto: duplica lógica do backend, ignora axes_priority |
| `frontend/src/features/dashboard/centroComando/CentroComando.jsx` | 75‑153 | Usa `localStorage.impetus_user.role/functional_area` + chama `getLayoutPorCargo` como fallback | ⚠️ Médio: fallback obrigatório em caso de falha do `personalizado` |
| `frontend/src/utils/roleUtils.js` | 6, 11‑23, 32‑72 | `MAINTENANCE_PATTERN` regex, `isHrFunctionalContext`, `resolveMenuRole`, `isLeadershipMenuKey`, `canAccessPulseRhRoute` | ⚠️ Médio: usado por menu/permissões de rotas |
| `frontend/src/hooks/useVisibleModules.js` | 10‑30, 36‑46 | `PATH_TO_MODULE` map, `STANDALONE_OPERATIONAL_PATHS` set, lê `profile_code`/`functional_area` | ⚠️ Médio: filtro de menu, fallback existe |
| `frontend/src/features/dashboard/DashboardMecanico.jsx` | — | layout específico técnico mecânico | Baixo: tela isolada |
| `frontend/src/components/Layout.jsx` | — | menu lateral por `resolveMenuRole(user)` | Baixo: já delega para `roleUtils` |
| `frontend/src/pages/Dashboard.jsx` | — | leitura `user.role` para variantes | Baixo: cabeçalho |
| `frontend/src/features/smartPanel/analyzeUserContext.js` | — | analisa role para SmartPanel | Baixo: heurística de IA |
| `frontend/src/modules/asset-management/utils/detectProfile.js` | — | detect por role/job_title | Baixo: módulo isolado |

### Funções públicas com hardcode por cargo

```text
LayoutPorCargo.js
  └── getLayoutPorCargo(role, department, dashboardProfile)

roleUtils.js
  ├── isMaintenanceProfile(user)        # regex MAINTENANCE_PATTERN
  ├── isHrFunctionalContext(user)       # regex \brh\b, /human resources/
  ├── shouldOfferPulseRhMenu(user)
  ├── isLeadershipMenuKey(menuKey)      # array ['ceo', 'diretor', 'gerente', ...]
  ├── resolveMenuRole(user)             # 8 if-chains por role/profile
  ├── canAccessPulseRhRoute(user)
  ├── isStrictAdminRole(user)
  ├── isColaboradorSimples(user)
  ├── isMaintenanceTechnicianMenu(user)
  ├── canAccessLiveDashboardUser(user)
  ├── canUseTaskOrchestrationUser(user)
  └── isExecutiveLeadershipRole(user)

useVisibleModules.js
  ├── filterMenuByModules(items, visibleModules)
  └── canAccessPath(path, visibleModules)

CentroComando.jsx
  └── widgets = personalizado?.layout?.length ? personalizado.layout : getLayoutPorCargo(...)
```

---

## 2. O que **já vem do backend**

| Endpoint | Resposta | Estado |
|---|---|---|
| `GET /dashboard/me` | `profile_code`, `visible_modules`, `kpis`, `user_context`, `personalization`, `engine_v2` (Phase 2) | ✅ Disponível |
| `GET /dashboard/personalizado` | `perfil`, `layout`, `assistente_ia`, `layout_rules_version` | ✅ Disponível |
| `GET /dashboard/live-surface` | `surface.blocks` | ✅ Disponível |

**O frontend já tem todos os dados necessários.** O que falta é **um adaptador único** que prefira `engine_v2.payload` quando presente, caia para `personalizado.layout`, e em última instância para `getLayoutPorCargo` (sem remover este último).

---

## 3. Componentes que ignoram `engine_v2`

| Ficheiro | Estado |
|---|---|
| `CentroComando.jsx` | ❌ usa só `dashboard.getPersonalizado()` |
| `LayoutPorCargo.js` | ❌ ignora qualquer dado de backend |
| `useVisibleModules.js` | ❌ usa só `visible_modules` |
| `Layout.jsx` (menu lateral) | ❌ usa só `resolveMenuRole` |

**Todos.** Nenhum componente lê `engine_v2`. Esta é a principal lacuna a fechar.

---

## 4. Telas que ainda dependem do Motor A

- **Centro de Comando** (`/app`) — usa fallback Motor A.
- **Pulse RH/Gestão** (`/app/pulse-*`) — gating por `shouldOfferPulseRhMenu` (regex job_title).
- **Menu lateral** — mapeia rota → role.

---

## 5. Mapa de desacoplamento (estratégia Phase 3)

```
ANTES (acoplado):
   user.role / user.job_title
        │
        ▼
 frontend regex/includes/hardcode  (LayoutPorCargo, roleUtils)
        │
        ▼
   widgets renderizados

DEPOIS (contextual, gradual):
   /dashboard/me  →  engine_v2 = { layout, identity, capabilities, explainability }
        │                                  │
        │                                  ▼
        │                  DashboardContextAdapter (NOVO, frontend)
        │                                  │
        │                                  ▼
        │              widgets renderizados (mesmo grid)
        │
        ▼
   FALLBACK PRESERVADO:
       │  se engine_v2 ausente → personalizado.layout
       │  se personalizado ausente → getLayoutPorCargo (Motor A)
       └────────────────────────────────────────────────┘
```

### Plano de migração faseada (3 vagas, sem big-bang)

#### Vaga 1 — `DashboardContextAdapter` (Phase 3 deste prompt)
- Novo módulo `frontend/src/features/dashboard/contextAdapter/`
- Hook `useDashboardContext` substitui as 2 `useEffect` de fetch em `CentroComando.jsx`
- Adapter prefere `engine_v2.payload`, depois `personalizado.layout`, depois `getLayoutPorCargo`
- **Sem quebrar:** `LayoutPorCargo` continua a existir e a ser invocado quando os outros falharem.

#### Vaga 2 — Menu contextual (futura)
- `useVisibleModules` ganha campo opcional `engine_v2.modules`
- `Layout.jsx` passa a delegar visibilidade ao mesmo adapter
- `roleUtils` torna-se um **fallback** chamado só quando o backend não responde

#### Vaga 3 — Remoção dos hardcodes (futura, depois de DIFF estável)
- `LayoutPorCargo.getLayoutPorCargo` reduzido a uma função de **emergência** (3 widgets básicos)
- Remoção total de regex em `roleUtils` (substituídas por capabilities)

Esta auditoria é o input para Phase 3, focada exclusivamente na Vaga 1.
