# SEC-13A — Observabilidade

| Métrica | Descrição |
|---------|-----------|
| `promotion_success` | Ciclos válidos |
| `promotion_failure` | Violações sequência |
| `promotion_duration` | ms último eval |
| `rollback_count` | Rollbacks registados |
| `runtime_errors` | Falhas validação |
| `operational_score` | 0–100 |
| `security_modules_online` | Módulos ONLINE |
| `security_modules_offline` | Módulos OFF/READY |

Endpoint: `GET /api/audit/security-operational-promotion`

Logs: `[SEC-13A]` · `[SEC-13A_EVAL]`
