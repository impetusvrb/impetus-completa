# Rollout Governance — Relatório Pilot

**Motor:** `rolloutGovernanceRuntime` + `rolloutEscalationProtection`

## Acções

| Endpoint | Efeito |
|----------|--------|
| freeze | Congela tenant |
| pause | Pausa rollout |
| rollback | Volta stage shadow, wave 1 |
| rollback-audience | Congela audiência, wave 1 |
| advance-wave | Próxima wave (se não frozen) |

## Protecção escalation

Bloqueia: auto_promotion, governance_escalation, authority_escalation, FULL sem aprovação manual.

## Rollback-safe

`rollback_generation` incrementado em cada rollback tenant.
