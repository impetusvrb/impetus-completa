# INC-022 — Correção definitiva de contaminação entre dashboards (Qualidade)

**Data:** 2026-07-15  
**Estado:** `QUALITY_SURFACE_LOCKED` · `QUALITY_DASHBOARD_BASELINE = LOCKED`  
**Classificação:** `ZERO_CROSS_SURFACE_CONTAMINATION` (superfície integrada)

---

## Problema

`CROSS_SURFACE_CONTAMINATION`: o motor cognitivo resolvia corretamente **Gerente de Qualidade**, mas a superfície carregada era `DashboardMecanico` (Painel de manutenção, Minhas Tarefas, Máquinas em Atenção).

**Causa raiz:** a rota `/app` usava heurística legada (`isMaintenanceProfile`) que autorizava manutenção quando `functional_area === 'maintenance'` ou substring `tecnic` no cargo — **sem gate de qualidade primário**. Eixos secundários (`eixo_manutencao`) no cadastro estrutural amplificavam o falso positivo via `maintenanceFromProfile`.

---

## Correção (origem — sem lógica paralela)

Política canónica reutilizada de **INC-009** (`dashboardSurfaceCapabilities.js`):

| Função | Papel |
|--------|-------|
| `isQualityPrimary()` | Fail-closed: perfil/cargo/área/eixo primário de qualidade |
| `resolveDashboardSurfaceCapabilities()` | `maintenance = false` quando `quality \|\| environmental \|\| executive` |
| `resolveMaintenanceFromDashboardMe()` | Bloqueia `maintenanceFromProfile` para qualidade primária |
| `hasMaintenanceDashboardSurface()` | Gate único para `DashboardMecanico` |
| `isMaintenanceProfile()` | Delega a `.maintenance` (menu/audiência alinhados) |

**Arquivos alterados (superfície apenas):**

- `frontend/src/utils/dashboardSurfaceCapabilities.js` — política INC-009/INC-022
- `frontend/src/utils/roleUtils.js` — delegação fail-closed
- `frontend/src/pages/Dashboard.jsx` — `hasMaintenanceProfileContext` + `maintenanceFromProfile`
- `frontend/src/hooks/useVisibleModules.js` — `resolveMaintenanceFromDashboardMe` no `/dashboard/me`

**Não alterados:** layout, CSS, Cognitive Core, Onipresença, Whisper, Máquina do Tempo, RBAC, novos dashboards.

---

## Auditoria de contaminação

```
QUALITY_SURFACE_OK              = YES
FOREIGN_MODULES_FOUND           = maintenance_dashboard, maintenance_tasks, maintenance_metrics (pré-fix)
FOREIGN_MODULES_REMOVED         = YES (superfície integrada → CentroComando)
PROFILE_RESOLUTION              = manager_quality | inspector_quality | coordinator_quality
FUNCTIONAL_AREA                 = quality | qualidade | eixo_qualidade
SURFACE_RESOLUTION              = commandCenter (maintenance=false)
VISIBLE_MODULES                 = quality_intelligence, operational, … (MODULE ACCESS inalterado)
FINAL_DASHBOARD                 = CentroComando (não DashboardMecanico)
```

---

## GAPs

| GAP | Estado |
|-----|--------|
| GAP-003 promoção SEC reject | Fora de scope INC-022 |
| Menu ManuIA via eixo secundário | MODULE ACCESS — não superfície |

---

## Regressão

Teste: `npm run test:dashboard-surface-segregation`

Personas validadas: Marcos (ambiental), Lima (manutenção), Wellington (executivo), Gerente/Técnico/Coord Qualidade, RH.

---

## Baseline

```
INC-022
QUALITY_SURFACE_LOCKED = YES
QUALITY_DASHBOARD_BASELINE = LOCKED
ZERO_CROSS_SURFACE_CONTAMINATION = YES
```
