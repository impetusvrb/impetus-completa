# SEC-13 — Observabilidade

| Métrica | Descrição |
|---------|-----------|
| `controlled_executions` | Ciclos de execução |
| `automatic_actions` | Acções AUTO ok |
| `manual_actions` | Reservado |
| `blocked_actions` | MANUAL_ONLY bloqueadas |
| `rollbacks` | Rollbacks executados |
| `execution_duration` | Última duração ms |
| `execution_failures` | Falhas |
| `execution_safety_score` | 0–100 |

Endpoint: `GET /api/audit/security-controlled-execution`

Logs: `[SEC-13]` · `[SEC-13_EVAL]`
