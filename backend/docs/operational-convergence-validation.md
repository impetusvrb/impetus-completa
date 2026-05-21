# Operational Convergence Validation (Phase Z.17)

## Objetivo

Validação operacional supervisionada **após** Z.16 (terminal lock). Não altera UX/CSS nem activa auto-remediation.

## Pacote

`backend/src/operationalValidation/`

| Módulo | Função |
|--------|--------|
| `pilotReactivationCoordinator.js` | Restaura pilotos aprovados pós-reload |
| `tenantActivationPersistence.js` | Snapshot JSON em `data/operational-validation/` |
| `runtimeFreezeStateValidator.js` | Valida freeze terminal |
| `refreshDeterminismValidator.js` | Oscilação / reinjection |
| `domainIsolationValidator.js` | RH, Qualidade, SST, Executivo, Operador |
| `kpiGovernanceValidator.js` | Leakage executivo |
| `summaryGovernanceValidator.js` | Narrative bleed |
| `underdeliveryRiskValidator.js` | Pruning excessivo |
| `cockpitOperationalValidator.js` | Integridade cockpit |
| `operationalConvergenceFacade.js` | Relatório consolidado |

## Relatório

Exposto em `/dashboard/me` como `operational_convergence_report` quando observability on.

## API

`GET /api/internal/operational-validation/{status,freeze-state,refresh,determinism,domains,kpis,summaries,underdelivery,cockpit,pilots,reload-recovery,report}`

`POST /api/internal/operational-validation/pilots/record`  
`POST /api/internal/operational-validation/pilots/reactivate`

## Flags

- `IMPETUS_PILOT_REACTIVATION=on` — recovery no boot
- `IMPETUS_OPERATIONAL_VALIDATION_OBSERVABILITY=on` — relatório em `/dashboard/me`
