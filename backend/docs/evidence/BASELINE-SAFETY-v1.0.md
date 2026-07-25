# BASELINE — Segurança (SST) v1.0

**INC:** INC-025  
**Data homologação:** 2026-07-15  
**Estado:** `SAFETY_BASELINE_LOCKED = YES`

---

## Eixo

| Campo | Valor |
|-------|-------|
| **PRIMARY_AXIS** | `eixo_seguranca` |
| **FUNCTIONAL_AREA** | `safety`, `seguranca`, `environmental_health_safety` (coord) |
| **DEPARTMENT** | Segurança do Trabalho / SST |

---

## Perfis homologados

| PROFILE_CODE | DASHBOARD_SURFACE | SPECIALIZED_RUNTIME |
|--------------|-------------------|---------------------|
| `manager_safety` | CentroComando | `safety_native` (Z25) |
| `coordinator_safety` | CentroComando | `safety_native` |
| `supervisor_safety` | CentroComando | `safety_native` |
| `director_safety` | CentroComando | `safety_native` |

**Nota:** Perfis SST existem em `domainDashboardProfiles.js`; ausentes de `dashboardProfiles.js` legado.

---

## Cadeia arquitectural

```
Perfil → regex SST em LayoutPorCargo / domain profile
  → /dashboard/me → Z25 safety_native
  → dashboardContextAdapter._buildFromSafetyCockpit (prioridade 6)
```

---

## Runtime

| Gate | Valor |
|------|-------|
| **runtime_ready** | YES — `safetyCockpitConsolidationRuntime`, domains/sst |
| **runtime_promoted** | PARTIAL — adapter |
| **consolidation_applied** | Condicional |
| **widgets_promoted** | YES quando Z25 passa |
| **native_runtime** | `safety_native` |

**Env:** `IMPETUS_SST_NATIVE_COCKPIT=on`, `IMPETUS_SAFETY_RENDER_PROMOTION=on`

---

## Visible modules

`dashboard`, `operational`, `proaction`, `biblioteca`, `ai`, `safety_intelligence`, `audit`, `settings`

**Rotas:** `/app/safety/operational`, `/app/safety`

---

## Widgets LayoutPorCargo (regex SST)

`kpi_cards`, `alertas`, `resumo_executivo`, `pergunte_ia`, `insights_ia` — **sem widget `seguranca` dedicado no WIDGET_COMPONENTS map**

---

## Segregação

| Campo | Valor |
|-------|-------|
| **FOREIGN_MODULES** | `hr_intelligence`, `quality_intelligence`, `manuia` — filtrados |
| **PLACEHOLDERS** | KPI/resumo genéricos |
| **CROSS_SURFACE_CONTAMINATION** | **LOW** — sem widgets operacionais cross-domain explícitos |

**Regra:** SST não contém módulos operacionais de outro domínio (salvo universais).

---

## Pendências

| ID | Descrição |
|----|-----------|
| P-SST-001 | Perfis SST só em domain layer — dependência `domainDashboardProfiles` |
| P-SST-002 | Layout depende de regex textual, não `dashboardProfile` explícito |
| P-SST-003 | EHS: coord → safety, gerente → environmental (split) |
| P-SST-004 | Sem hub promotion SST no CC |

---

## Gates

```
SAFETY_PROFILE_OK    = YES
SAFETY_SURFACE_OK    = YES
SAFETY_RUNTIME_OK    = PARTIAL
SAFETY_MODULES_OK    = YES
SAFETY_BASELINE_LOCKED = YES
```
