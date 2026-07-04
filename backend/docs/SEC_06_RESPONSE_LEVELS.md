# SEC-06 — Response Levels

## LEVEL 0 — Observe

Nenhuma acção. Equivalente ao comportamento SEC-01→05 sem orchestrator.

## LEVEL 1 — Advise (default)

Recomendações textuais ao operador. `operator_required: true` para acções manuais.

## LEVEL 2 — Assist

Acções reversíveis permitidas:

- EVIDENCE_SNAPSHOT
- ELEVATE_LOG_LEVEL
- PRESERVE_EVIDENCE
- FORCE_METRICS_COLLECT
- RUN_INTEGRITY_CHECK / RUN_CORRELATION / RUN_THREAT_INTEL
- CONSOLIDATED_REPORT
- OPEN_INTERNAL_INCIDENT

## LEVEL 3 — Protect

- `SECURITY_RESPONSE_PROTECT_ENABLED=false` por defeito
- Gera `adaptiveProtectionPlan` — zero execução automática
- Requer aprovação explícita + dual operator para integridade comprometida

## Resolução determinística

| Condição | Nível recomendado |
|----------|-------------------|
| OPERATIONAL_ACCESS | OBSERVE |
| MEDIUM | ADVISE |
| HIGH / DEGRADED | ASSIST |
| CRITICAL | ASSIST |
| INTEGRITY COMPROMISED | PROTECT (plano) |

Modo efectivo = min(recomendado, default_mode, max_level).
