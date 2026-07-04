# SEC-19 — Observabilidade

## Métricas Prometheus-style (in-process)

| Métrica | Tipo | Descrição |
|---------|------|-----------|
| `attack_simulations` | counter | Cenários de ataque executados |
| `stress_runs` | counter | Tiers de stress executados |
| `operational_certifications` | counter | Certificações completadas |
| `false_positive_rate` | gauge | Taxa FP estimada |
| `false_negative_rate` | gauge | Taxa FN estimada |
| `operational_score` | gauge | Score operacional agregado |
| `security_readiness` | gauge | Prontidão de protecção |
| `certification_runs` | counter | Execuções totais |

## Snapshot

`GET /api/audit/security-operational-certification` → campo `metrics`

## DTO Dashboard

Schema: `security_operational_certification_v1`

Campos principais:

- `attackCoverage`
- `detectionAccuracy`
- `operationalScore`
- `runtimeHealth`
- `stressResults`
- `readinessLevel`
- `certificationDecision`

## Implementação

`backend/src/securityOperationalCertification/metrics/operationalCertificationMetrics.js`
