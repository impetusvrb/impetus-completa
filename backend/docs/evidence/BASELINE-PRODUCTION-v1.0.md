# BASELINE — Produção v1.0

**INC:** INC-025  
**Data homologação:** 2026-07-15  
**Estado:** `PRODUCTION_BASELINE_LOCKED = YES`

---

## Eixo

| Campo | Valor |
|-------|-------|
| **PRIMARY_AXIS** | `eixo_operacional` / `eixo_planejamento` |
| **FUNCTIONAL_AREA** | `production`, `producao`, `operations`, `pcp` |
| **DEPARTMENT** | Produção / PCP / Operações |

---

## Perfis homologados

| PROFILE_CODE | DASHBOARD_SURFACE | SPECIALIZED_RUNTIME |
|--------------|-------------------|---------------------|
| `manager_production` | CentroComando | `production_native` (ZP0) |
| `coordinator_production` | CentroComando | `production_native` |
| `supervisor_production` | CentroComando | `production_native` |
| `analyst_pcp` | CentroComando | `production_native` |
| `manager_operations` | CentroComando | `production_native` |
| `coordinator_operations` | CentroComando | `production_native` |
| `supervisor_operations` | CentroComando | `production_native` |
| `operator_floor` | **DashboardOperador** | none (fallback global) |
| `director_industrial` | CentroComando | `production_native` (overlap industrial) |

---

## Cadeia arquitectural

```
Perfil → /dashboard/me → ZP0 production_native consolidation
  → dashboardContextAdapter._buildFromProductionCockpit (prioridade 4)
  → CentroComando | DashboardOperador (operador)
```

---

## Runtime

| Gate | Valor |
|------|-------|
| **runtime_ready** | YES |
| **runtime_promoted** | PARTIAL — adapter only; widgets `operacoes`, `gargalos`, `desperdicio` genéricos no CC |
| **consolidation_applied** | Condicional — gates ZP0 + binding |
| **widgets_promoted** | YES quando ZP0 passa |
| **native_runtime** | `production_native` |

**Env:** `IMPETUS_PRODUCTION_NATIVE_COCKPIT=on`, `IMPETUS_PRODUCTION_RENDER_PROMOTION=on`

---

## Visible modules

`dashboard`, `operational`, `proaction`, `biblioteca`, `ai`, `anomaly_detection`, `audit`, `settings`

---

## Widgets CentroComando (LayoutPorCargo)

`kpi_cards`, `operacoes`, `gargalos`, `desperdicio`, `centro_previsao`, `alertas`, `grafico_tendencia`, `pergunte_ia`

---

## Segregação

| Campo | Valor |
|-------|-------|
| **FOREIGN_MODULES** | `quality_intelligence`, `manuia`, `environment_intelligence` — filtrados por eixo |
| **PLACEHOLDERS** | `operacoes`, `kpi_cards` quando runtime off |
| **CROSS_SURFACE_CONTAMINATION** | **NONE** para perfis produção primários |

---

## Pendências

| ID | Descrição |
|----|-----------|
| P-PROD-001 | `_default` gerente/coordenador/supervisor → `manager_production` quando área desconhecida |
| P-PROD-002 | `getProfile()` fallback global → `operator_floor` |
| P-PROD-003 | Sem promotion de hubs produção no CC (só adapter metadata) |

---

## Gates

```
PRODUCTION_PROFILE_OK    = YES
PRODUCTION_SURFACE_OK    = YES
PRODUCTION_RUNTIME_OK    = PARTIAL
PRODUCTION_MODULES_OK    = YES
PRODUCTION_BASELINE_LOCKED = YES
```
