# Enterprise Rollout Readiness — Relatório

**Motor:** `EnterpriseControlledRolloutEngine` + `EnterpriseDecisionEngine`

## Estágios

SHADOW → PILOT → CONTROLLED → STAGED → FULL

## Garantias

- `auto_promotion: false`
- `governance_escalation: false`
- `authority_escalation: false`
- `rollback_safe: true`

## Dashboard

`EnterpriseOperationalMaturityDashboard` em `QualityRolloutHub` (rollout enterprise QUALITY).

## Decisão operacional (Fase 12)

| Acção | Quando |
|-------|--------|
| **REMAIN_IN_SHADOW** | Default recomendado |
| **ADVANCE_TO_PILOT** | Runtime estável + UX não CRITICAL + readiness ≥45 (manual) |
| **BLOCK_ROLLOUT** | Runtime instável |
| **REDUCE_UX_DENSITY** | Overload cognitivo ou UX CRITICAL |
| **ADJUST_AUDIENCE** | failure_rate > 25% |

**Proibido:** promoção automática para FULL.

## Fase 12 — Enterprise Decision Engine

| Acção | Condição |
|-------|----------|
| `REMAIN_IN_SHADOW` | Default |
| `ADVANCE_TO_PILOT` | Runtime estável + sem blockers + manual_only |
| `ADVANCE_TO_CONTROLLED` | Após pilot validado + manual_only |
| `BLOCK_ROLLOUT` | Runtime instável |
| `REDUCE_UX_DENSITY` | UX CRITICAL ou cognitive overload |
| `ADJUST_AUDIENCE` | failure_rate > 25% |

API: `GET /api/enterprise-runtime-validation/decision` (assistivo)
