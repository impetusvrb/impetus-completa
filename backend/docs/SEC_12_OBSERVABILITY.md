# SEC-12 — Observabilidade

| Métrica | Descrição |
|---------|-----------|
| `validated_actions` | Acções VALID |
| `blocked_actions` | BLOCKED/INVALID |
| `dry_runs` | Simulações |
| `rollback_validations` | Validações rollback |
| `execution_scores` | Readiness calculado |
| `approval_failures` | Aprovações insuficientes |
| `impact_assessments` | Análises de impacto |

Endpoint: `GET /api/audit/security-execution-validation`

Logs: `[SEC-12]` · `[SEC-12_EVAL]`
