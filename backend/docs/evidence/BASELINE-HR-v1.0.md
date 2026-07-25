# BASELINE — Recursos Humanos v1.0

**INC:** INC-025  
**Data homologação:** 2026-07-15  
**Estado:** `HR_BASELINE_LOCKED = YES`

---

## Eixo

| Campo | Valor |
|-------|-------|
| **PRIMARY_AXIS** | `eixo_rh` |
| **FUNCTIONAL_AREA** | `hr`, `rh`, `recursos_humanos` |
| **DEPARTMENT** | Recursos Humanos |

---

## Perfis homologados

| PROFILE_CODE | DASHBOARD_SURFACE | SPECIALIZED_RUNTIME |
|--------------|-------------------|---------------------|
| `hr_management` | CentroComando | `hr_native` (Z26) |
| `manager_hr` | CentroComando | `hr_native` |
| `coordinator_hr` | CentroComando | `hr_native` |
| `supervisor_hr` | CentroComando | `hr_native` |
| `director_hr` | CentroComando | `hr_native` |

---

## Cadeia arquitectural

```
Perfil → isStaffCentroProfile / isHrDashboardLayout → CentroComando
  → /dashboard/me → Z26 hr_native
  → dashboardContextAdapter._buildFromHrCockpit (prioridade 5)
```

---

## Runtime

| Gate | Valor |
|------|-------|
| **runtime_ready** | YES |
| **runtime_promoted** | PARTIAL — adapter |
| **consolidation_applied** | Condicional |
| **widgets_promoted** | YES quando Z26 passa |
| **native_runtime** | `hr_native` / `people_native` |

**Env:** `IMPETUS_HR_NATIVE_COCKPIT=on`, `IMPETUS_HR_RENDER_PROMOTION=on`

---

## Visible modules

`dashboard`, `operational`, `chat`, `biblioteca`, `ai`, `hr_intelligence`, `settings`

**Rotas:** `/app/pulse-rh`, `/app/pulse-gestao`

---

## Widgets LayoutPorCargo

`kpi_cards`, `resumo_executivo`, `alertas`, `pergunte_ia`, `insights_ia`, `grafico_tendencia`, `grafico_clima_equipe`

---

## Segregação

| Campo | Valor |
|-------|-------|
| **FOREIGN_MODULES** | `manuia`, `quality_intelligence`, `environment_intelligence`, `safety_intelligence` — bloqueados para RH |
| **PLACEHOLDERS** | KPI/resumo genéricos |
| **CROSS_SURFACE_CONTAMINATION** | **NONE** para perfis RH primários |

**Regra:** RH nunca contém maintenance, quality, environment, production widgets dedicados.

---

## Pendências

| ID | Descrição |
|----|-----------|
| P-HR-001 | Duplicidade `hr_management` vs `manager_hr` no resolver |
| P-HR-002 | `isHrDashboardLayout` não lista explicitamente `manager_hr`/`coordinator_hr` |
| P-HR-003 | `hr_intelligence.compatible_areas` amplas (operations, industrial) |
| P-HR-004 | Sem hub promotion RH no CC |

---

## Gates

```
HR_PROFILE_OK    = YES
HR_SURFACE_OK    = YES
HR_RUNTIME_OK    = PARTIAL
HR_MODULES_OK    = YES
HR_BASELINE_LOCKED = YES
```
