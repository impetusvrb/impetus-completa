# ECO-04 — Observabilidade Controller Consumer

**Fase:** 4 · **Data:** 2026-07-02

---

## Endpoint

```
GET /api/audit/eco-controller/status
```

Resposta:
- `enabled` / `shadow_mode` — estado flag
- `shadow_total`, `matches`, `divergences` — shadow mode
- `consumer_total`, `decisions_consumed`, `parallel_decisions`
- `avg_legacy_ms`, `avg_governance_ms` — latência comparativa
- `adapter` — eventos avaliados, council blocked/allowed

---

## Métricas

| Métrica | Descrição |
|---------|-----------|
| `eco_controller_shadow_total` | Avaliações shadow |
| `eco_controller_shadow_match` | Matches pipeline vs EG |
| `eco_controller_shadow_divergence` | Divergências |
| `eco_controller_consumer_total` | Modo consumer activo |
| `eco_controller_decisions_consumed` | Decisões consumidas |
| `eco_controller_parallel_decisions` | Decisões paralelas detectadas |
| `eco_controller_consumer_events` | Total eventos adapter |

---

## Campos registados por request

| Campo | Shadow | Consumer |
|-------|--------|----------|
| policyId | ✅ | ✅ |
| match/divergence | ✅ | — |
| durationMs | ✅ | ✅ |
| consumed | — | ✅ |
| parallel | ✅ | ✅ |

---

## Comparação baseline

Usar baseline ECO-03 + novo snapshot pós-ECO-04:

```bash
node scripts/eco/eco-03-baseline-snapshot.js
```

Comparar `ecoConvergence` vs `eco-controller` metrics após tráfego cognitivo em staging.

---

## Critérios activação consumer

| Critério | Threshold |
|----------|-----------|
| ECO-03 shadow match | ≥ 85% (3 fluxos) |
| ECO-04 shadow match | ≥ 85% |
| Estabilidade | 7 dias |
| Health/deep health | OK |

Até lá: **modo observacional** — registrar divergências, não activar flag.

---

## Logs

| Prefixo | Origem |
|---------|--------|
| `[cognitiveControllerConsumerAdapter]` | Adapter evaluate/consume |
| `[COGNITIVE_CONTROLLER_ERROR]` | Erros council (inalterado) |
