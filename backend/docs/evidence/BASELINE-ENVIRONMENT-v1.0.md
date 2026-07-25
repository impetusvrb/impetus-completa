# BASELINE — Meio Ambiente v1.0

**INC:** INC-025  
**Data homologação:** 2026-07-15  
**Estado:** `ENVIRONMENT_BASELINE_LOCKED = YES`

---

## Eixo

| Campo | Valor |
|-------|-------|
| **PRIMARY_AXIS** | `eixo_ambiental` |
| **FUNCTIONAL_AREA** | `environmental`, `meio_ambiente`, `sustainability`, `esg`, `utilities` |
| **DEPARTMENT** | Meio Ambiente / Sustentabilidade |

---

## Perfis homologados

| PROFILE_CODE | DASHBOARD_SURFACE | SPECIALIZED_RUNTIME |
|--------------|-------------------|---------------------|
| `manager_environmental` | CentroComando | `environmental_native` (P1) |
| `coordinator_environmental` | CentroComando | `environmental_native` |
| `supervisor_environmental` | CentroComando | `environmental_native` |

---

## Cadeia arquitectural

```
Perfil → isEnvironmentalPrimary() → CentroComando (bloqueia DashboardMecanico)
  → /dashboard/me → P1 environmental_native
  → dashboardContextAdapter._buildFromEnvironmentalCockpit (prioridade 2)
```

---

## Runtime

| Gate | Valor |
|------|-------|
| **runtime_ready** | YES — `environmentalCockpitConsolidator`, domains/environmental |
| **runtime_promoted** | PARTIAL — adapter; sem hub promotion CC dedicada |
| **consolidation_applied** | Condicional |
| **widgets_promoted** | YES quando P1 passa |
| **native_runtime** | `environmental_native` |

**Env:** `IMPETUS_ENVIRONMENTAL_NATIVE_COCKPIT=on`, `IMPETUS_ENVIRONMENTAL_RENDER_PROMOTION=on`

---

## Visible modules

`dashboard`, `operational`, `proaction`, `biblioteca`, `ai`, `environment_intelligence`, `audit`, `settings`

**Rota canónica:** `/app/environment/operational`

---

## Widgets LayoutPorCargo

`kpi_cards`, **`operacoes`**, `alertas`, `pergunte_ia`, `insights_ia`

---

## Segregação

| Campo | Valor |
|-------|-------|
| **FOREIGN_MODULES** | `manuia`, `quality_intelligence` — filtrados |
| **PLACEHOLDERS** | `kpi_cards`, `operacoes` |
| **CROSS_SURFACE_CONTAMINATION** | **PARTIAL** — widget `operacoes` é domínio produção (P-ENV-001) |

---

## Pendências

| ID | Descrição |
|----|-----------|
| P-ENV-001 | **Contaminação widget:** `OPERACOES` no layout ambiental (`LayoutPorCargo.js` L120) |
| P-ENV-002 | EHS split: coord `environmental_health_safety` → safety; gerente → environmental |
| P-ENV-003 | `director` + `environmental` → `director_industrial` |
| P-ENV-004 | Sem `EnvironmentalNativeCockpitPromotion` no CC |

---

## Gates

```
ENVIRONMENT_PROFILE_OK    = YES
ENVIRONMENT_SURFACE_OK    = YES
ENVIRONMENT_RUNTIME_OK    = PARTIAL
ENVIRONMENT_MODULES_OK    = PARTIAL (widget operacoes)
ENVIRONMENT_BASELINE_LOCKED = YES
```
