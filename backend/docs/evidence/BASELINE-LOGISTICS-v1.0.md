# BASELINE — Logística v1.0

**INC:** INC-025  
**Data homologação:** 2026-07-15  
**Estado:** `LOGISTICS_BASELINE_LOCKED = YES`

---

## Eixo

| Campo | Valor |
|-------|-------|
| **PRIMARY_AXIS** | `eixo_logistica` / `eixo_estoque` |
| **FUNCTIONAL_AREA** | `logistics`, `logistica` |
| **DEPARTMENT** | Logística / Armazém / Expedição |

---

## Perfis homologados

| PROFILE_CODE | DASHBOARD_SURFACE | SPECIALIZED_RUNTIME |
|--------------|-------------------|---------------------|
| `manager_logistics` | CentroComando | **none** |
| `coordinator_logistics` | CentroComando | **none** |
| `supervisor_logistics` | CentroComando | **none** |

**Nota:** Perfis só em `domainDashboardProfiles.js` (C.6).

---

## Cadeia arquitectural

```
Perfil → LayoutPorCargo regex logística
  → /dashboard/me → sem runtime nativo dedicado
  → dashboardContextAdapter → personalizado | engine_v2 | layout_fallback
```

---

## Runtime

| Gate | Valor |
|------|-------|
| **runtime_ready** | PARTIAL — domínio `logistics_intelligence` existe |
| **runtime_promoted** | NO |
| **consolidation_applied** | N/A |
| **widgets_promoted** | NO |
| **native_runtime** | none |

---

## Visible modules

`dashboard`, `operational`, `proaction`, `biblioteca`, `ai`, `logistics_intelligence`, `settings`

**Rotas:** `/app/logistics/operational`, `/app/logistica-inteligente`, `/app/almoxarifado-inteligente`

---

## Widgets LayoutPorCargo

`logistica`, `estoque`, `kpi_cards`, `alertas`, `pergunte_ia`, `insights_ia`

---

## Segregação

| Campo | Valor |
|-------|-------|
| **FOREIGN_MODULES** | Domínios strict filtrados por eixo |
| **PLACEHOLDERS** | Widgets logística/estoque genéricos |
| **CROSS_SURFACE_CONTAMINATION** | **NONE** |

---

## Pendências

| ID | Descrição |
|----|-----------|
| P-LOG-001 | Sem runtime `logistics_native` (gap arquitectural) |
| P-LOG-002 | `director` + `logistics` → `director_operations` |
| P-LOG-003 | `logistics_intelligence` governance parcial vs menu |

---

## Gates

```
LOGISTICS_PROFILE_OK    = YES
LOGISTICS_SURFACE_OK    = YES
LOGISTICS_RUNTIME_OK    = NO (documentado)
LOGISTICS_MODULES_OK    = YES
LOGISTICS_BASELINE_LOCKED = YES
```
