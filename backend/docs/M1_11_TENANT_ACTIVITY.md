# M1.11 — Tenant Activity

**Fase:** M1.11 · Tenant `511f4819`  
**Status:** OPERATIONAL

---

## Critérios

```json
{
  "active_users_detected": true,
  "executive_users_detected": true,
  "operational_users_detected": true,
  "tenant_activity_confirmed": true
}
```

---

## Evidências BD (janela 30d)

| Métrica | Valor |
|---------|-------|
| Utilizadores distintos (`ai_interaction_traces`) | 12 |
| Utilizadores executivos (ceo/diretor) | 4 |
| Utilizadores operacionais (coord/supervisor/gerente/colaborador) | 7 |
| Total traces AI | 429 |
| `audit_logs` eventos | 327 |
| Utilizadores distintos audit | 1 |

---

## Conclusão

Actividade real **confirmada** — não basta runtime activo; há utilizadores executivos e operacionais com interacções registadas.
