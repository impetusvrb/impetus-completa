# Phase Z.1 — Contextual Enforcement Preparation

## Objetivo

Transformar observação Z.0 em **readiness contextual real** — matriz canónica, classificação de módulos, simulação de pruning — **sem enforcement automático**.

## Módulos

`backend/src/contextualEnforcement/`

| Área | Módulos |
|------|---------|
| Matriz canónica | `canonicalDeliveryMatrix`, `governedModuleAuthorityMap`, `hierarchicalVisibilityMatrix`, `domainBoundaryMatrix`, `operationalScopeMatrix` |
| Classificação | `moduleDeliveryClassification` (STRICT, DOMAIN_ONLY, EXECUTIVE_ONLY, …) |
| Readiness | `contextualMenuTargetingValidator`, `runtimeVisibilityReadiness`, `hierarchyDeliveryReadiness`, `deliveryConflictResolver` |
| Simulação | `safeContextualPruningAdvisor`, `shadowModulePruningSimulation`, `contextualGracefulDegradation`, `lowDensityDeliveryReducer` |

## API

`/api/internal/contextual-enforcement/{status,readiness,leakage,conflicts,hierarchy,visibility,pruning-simulation,report}`

## Flags (Etapa 8)

| Variável | Default |
|----------|---------|
| `IMPETUS_CONTEXTUAL_ENFORCEMENT_PREPARATION` | off |
| `IMPETUS_CANONICAL_DELIVERY_MATRIX` | off |
| `IMPETUS_TENANT_DELIVERY_PROFILING` | off |
| `IMPETUS_DASHBOARD_DENSITY_GOVERNANCE` | off |
| `IMPETUS_CONTEXTUAL_PRUNING_SIMULATION` | off |
| `IMPETUS_CONTEXTUAL_ENFORCEMENT_OBSERVABILITY` | **on** |

## Path Z.2

1. Tenant `enforcement_ready === true`
2. `visibility.readiness_score >= 0.85`
3. Aprovação humana + `execute=true`
4. Activar flags de preparation (não hard global)

## Testes

```bash
npm run test:contextual-enforcement
```
