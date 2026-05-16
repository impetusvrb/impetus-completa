# Replay & Idempotency Report

**Timestamp:** 2026-05-16T17:39:20.429Z

## Fase 2 — Workflow / idempotência

- Tabelas de workflow não encontradas — fase 2 parcialmente skip.


## Fase 3 — Event backbone

- correlation_id / causation_id / trace_id / workflow_id / tenant_id / layers: **OK**
- Replay shadow (`IMPETUS_INDUSTRIAL_REPLAY_SHADOW`): verificar flag no ambiente de integração.
- DLQ: validar com `test:soak:dlq` / cenários WAVE1 em pipeline CI.

