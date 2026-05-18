# Pilot Readiness — Relatório (Shadow Cycle)

**Motores:** `tenantPilotReadinessEngine` · `operationalReadinessScoring` · `enterpriseRolloutRecommendationEngine`

## Status possíveis

| Status | Significado |
|--------|-------------|
| `remain_in_shadow` | Default — continuar observação |
| `pilot_ready` | Condições para pilot manual por tenant |
| `controlled_ready` | Candidato a CONTROLLED (revisão humana) |

## Proibido

- `auto_promotion: false`
- `manual_only: true`
- Sem FULL automático

## Pré-requisitos pilot

1. `multi_domain_publication.publication_stable`
2. `friction.acceptable`
3. `rollout_readiness_score` ≥ 45
4. Sem cognitive overload crítico

## Acção recomendada agora

**remain_in_shadow** até dados reais multi-tenant (48–72h).
