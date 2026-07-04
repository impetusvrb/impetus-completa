# SEC-10 — Observabilidade

## Métricas

| Métrica | Descrição |
|---------|-----------|
| `active_defense_events` | Avaliações executadas |
| `active_defense_recommendations` | Recomendações geradas |
| `active_defense_modes` | Transições de modo |
| `attack_patterns_detected` | Padrões identificados |
| `campaigns_detected` | Campanhas persistentes |
| `distributed_scans` | Scans distribuídos |
| `critical_incidents` | Incidentes CRITICAL |
| `defense_state_changes` | Mudanças NORMAL→PROTECTED |

---

## Endpoint audit

```
GET /api/audit/security-active-defense
```

Payload inclui: dashboard, métricas, campanhas, histórico recomendações.

---

## Logs

Prefixo: `[SEC-10]` no bootstrap e `[SEC-10_EVAL]` em erros de avaliação.

---

## Intervalo

`SECURITY_ACTIVE_DEFENSE_EVAL_MS` (default 60s) — apenas quando flag ON.
