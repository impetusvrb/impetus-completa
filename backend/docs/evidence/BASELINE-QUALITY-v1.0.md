# BASELINE — Qualidade v1.0

**INC:** INC-025  
**Data homologação:** 2026-07-15  
**Estado:** `QUALITY_BASELINE_LOCKED = YES`

---

## Eixo

| Campo | Valor |
|-------|-------|
| **PRIMARY_AXIS** | `eixo_qualidade` / `eixo_laboratorial` |
| **FUNCTIONAL_AREA** | `quality`, `qualidade`, `laboratory`, `laboratorio` |
| **DEPARTMENT** | Qualidade / Laboratório |

---

## Perfis homologados

| PROFILE_CODE | DASHBOARD_SURFACE | SPECIALIZED_RUNTIME |
|--------------|-------------------|---------------------|
| `manager_quality` | CentroComando | `quality_native` (Z22+Z23) |
| `coordinator_quality` | CentroComando | `quality_native` |
| `supervisor_quality` | CentroComando | `quality_native` |
| `inspector_quality` | CentroComando | `quality_native` (piloto parcial) |

**Laboratório:** sem perfil dedicado — mapeia para perfis quality acima (`laboratory` → `manager_quality`).

---

## Cadeia arquitectural (pós INC-024)

```
Perfil → isQualityPrimary() fail-closed → CentroComando
  → /dashboard/me → Z22 render promotion + Z23 consolidation
  → resolveSpecializedCockpitRuntime()
  → QualityNativeCockpitPromotion (hubs existentes)
  → QualityGovernanceHub | QualityTelemetryHub | CognitiveQualityHub
```

---

## Runtime

| Gate | Valor |
|------|-------|
| **runtime_ready** | YES (~78 ficheiros domínio) |
| **runtime_promoted** | **YES** (INC-024) |
| **consolidation_applied** | Condicional — binding_ratio ≥ 0.35 |
| **widgets_promoted** | YES |
| **native_runtime** | `quality_native` |

**Env:** `IMPETUS_SPECIALIZED_COCKPIT_RUNTIME=quality_native`, `IMPETUS_QUALITY_NATIVE_COCKPIT=on`

---

## Visible modules

`dashboard`, `operational`, `proaction`, `biblioteca`, `ai`, `raw_material_lots`, `quality_intelligence`, `audit`, `settings`

---

## Widgets suprimidos (quality_native activo)

`qualidade`, `kpi_cards`, `rastreabilidade`, `receitas`, `grafico_tendencia`, `operacoes`, `manutencao`

---

## Segregação

| Campo | Valor |
|-------|-------|
| **FOREIGN_MODULES** | `manuia`, `environment_intelligence` — filtrados |
| **PLACEHOLDERS** | 0 com Z23 activo; 7 IDs suprimidos |
| **CROSS_SURFACE_CONTAMINATION** | **NONE** (INC-022 + INC-024) |

---

## Pendências

| ID | Descrição |
|----|-----------|
| P-QLT-001 | Inspeção/Rollout/Rastreabilidade sem center Z.23 — ver INC-024 blockers |
| P-QLT-002 | `director` + `quality` → `director_industrial` |
| P-QLT-003 | Lab colapsado em quality (sem perfil lab dedicado) |

---

## Gates

```
QUALITY_PROFILE_OK    = YES
QUALITY_SURFACE_OK    = YES
QUALITY_RUNTIME_OK    = YES
QUALITY_MODULES_OK    = YES
QUALITY_BASELINE_LOCKED = YES
```

**Referências:** `INC-023`, `INC-024`, `INC-022`
