# SEC-11 — Observabilidade

## Métricas

| Métrica | Descrição |
|---------|-----------|
| `adaptive_protection_plans` | Planos gerados |
| `runtime_protection_score` | Score 0–1 |
| `recommended_profiles` | Perfis recomendados |
| `approval_requests` | Pedidos de aprovação |
| `approved_protections` | Aprovações completas |
| `recovery_plans` | Planos de recuperação |
| `rollback_plans` | Planos de rollback |
| `scanner_patterns` | Padrões anti-scanner |

---

## Endpoint

`GET /api/audit/security-adaptive-protection`

---

## Logs

`[SEC-11]` bootstrap · `[SEC-11_EVAL]` erros avaliação
