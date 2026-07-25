# BASELINE — Manutenção v1.0

**INC:** INC-025  
**Data homologação:** 2026-07-15  
**Estado:** `MAINTENANCE_BASELINE_LOCKED = YES`

---

## Eixo

| Campo | Valor |
|-------|-------|
| **PRIMARY_AXIS** | `eixo_manutencao` |
| **FUNCTIONAL_AREA** | `maintenance`, `manutencao` |
| **DEPARTMENT** | Manutenção / PCM |

---

## Perfis homologados

| PROFILE_CODE | DASHBOARD_SURFACE | SPECIALIZED_RUNTIME |
|--------------|-------------------|---------------------|
| `manager_maintenance` | **DashboardMecanico** | `maintenance_native` (ZM1) |
| `coordinator_maintenance` | **DashboardMecanico** | `maintenance_native` |
| `supervisor_maintenance` | **DashboardMecanico** | `maintenance_native` |
| `technician_maintenance` | **DashboardMecanico** | `maintenance_native` |

---

## Cadeia arquitectural

```
Perfil → dashboardSurfaceCapabilities (maintenance fail-closed INC-022)
  → Dashboard.jsx → DashboardMecanico (NÃO CentroComando)
  → /dashboard/me → ZM1 maintenance_native
  → dashboardContextAdapter._buildFromMaintenanceCockpit
```

**Segregação INC-022:** Qualidade, ambiental e executivo **nunca** recebem DashboardMecanico.

---

## Runtime

| Gate | Valor |
|------|-------|
| **runtime_ready** | YES |
| **runtime_promoted** | PARTIAL — adapter; superfície própria DashboardMecanico |
| **consolidation_applied** | Condicional |
| **widgets_promoted** | YES quando ZM1 passa |
| **native_runtime** | `maintenance_native` |

**Env:** `IMPETUS_MAINTENANCE_NATIVE_COCKPIT=on`, `IMPETUS_MAINTENANCE_RENDER_PROMOTION=on`

---

## Visible modules

`dashboard`, `operational`, `proaction`, `biblioteca`, `ai`, `anomaly_detection`, `audit`, `manuia`, `settings`

---

## Widgets (DashboardMecanico / LayoutPorCargo)

`manutencao`, `kpi_cards`, `mapa_vazamentos`, `energia`, `alertas`, `pergunte_ia`, `insights_ia`, `resumo_executivo`

---

## Segregação

| Campo | Valor |
|-------|-------|
| **FOREIGN_MODULES** | `quality_intelligence`, `hr_intelligence`, `environment_intelligence` |
| **PLACEHOLDERS** | Widget manutenção genérico quando runtime off |
| **CROSS_SURFACE_CONTAMINATION** | **NONE** (INC-022 validado) |

---

## Pendências

| ID | Descrição |
|----|-----------|
| P-MNT-001 | Heurística `tecnic` em `MAINTENANCE_HEURISTIC_PATTERN` — mitigada por fail-closed qualidade |
| P-MNT-002 | `manuia.compatible_areas` inclui `production`/`operations` — vazamento menu potencial |
| P-MNT-003 | Hub promotion ZM1 no CC N/A (superfície separada — by design) |

---

## Gates

```
MAINTENANCE_PROFILE_OK    = YES
MAINTENANCE_SURFACE_OK    = YES (DashboardMecanico locked)
MAINTENANCE_RUNTIME_OK    = PARTIAL
MAINTENANCE_MODULES_OK    = YES
MAINTENANCE_BASELINE_LOCKED = YES
```

**Referência:** `INC-022-QUALITY-SURFACE-SEGREGATION.md`
