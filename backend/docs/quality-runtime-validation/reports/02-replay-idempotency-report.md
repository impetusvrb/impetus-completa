# Replay & Idempotency Report

**Timestamp:** 2026-05-17T02:30:36.416Z

## Fase 2 — Workflow / idempotência

- Definição **ncr_universal**: OK
- Definição **capa_universal**: OK
- Definição **pdca_universal**: OK
- Definição **approval_universal**: OK
- Definição **escalation_universal**: OK
- Transações: transição usa `SELECT … FOR UPDATE` (anti corrida).
- Shadow: payloads de evento incluem `shadow_mode` via publisher.


## Fase 3 — Event backbone

- correlation_id / causation_id / trace_id / workflow_id / tenant_id / layers: **OK**
- Replay shadow (`IMPETUS_INDUSTRIAL_REPLAY_SHADOW`): verificar flag no ambiente de integração.
- DLQ: validar com `test:soak:dlq` / cenários WAVE1 em pipeline CI.

