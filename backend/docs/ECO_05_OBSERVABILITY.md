# ECO-05 — Observabilidade Pulse Consumer

**Fase:** 5 · **Data:** 2026-07-02

---

## Endpoint

```
GET /api/audit/eco-pulse/status
```

Resposta:
- `enabled` / `shadow_mode`
- `shadow_total`, `matches`, `divergences`
- `analytics_consumed`, `own_analytics_preserved`
- `avg_legacy_ms`, `avg_governance_ms`
- `adapter.events_evaluated`

---

## Métricas

| Métrica | Descrição |
|---------|-----------|
| `eco_pulse_shadow_total` | Avaliações shadow |
| `eco_pulse_shadow_match` | Matches Pulse vs EG |
| `eco_pulse_shadow_divergence` | Divergências |
| `eco_pulse_consumer_total` | Modo consumer |
| `eco_pulse_analytics_consumed` | Analytics EG consumidos |
| `eco_pulse_consumer_events` | Total eventos adapter |

---

## Campos registados

| Campo | Shadow | Consumer |
|-------|--------|----------|
| confidence compare | ✅ | — |
| health compare | ✅ | — |
| governance_analytics | shadow block | ✅ |
| pulse_own_preserved | ✅ | ✅ |
| reuseRate | — | ✅ |

---

## Executive dashboard enrichments

**Shadow (OFF):**
```json
{
  "governance_shadow": {
    "comparison": { "match": true, "pulse": {}, "governance": {} },
    "governance_metrics": {},
    "pulse_parallel": {}
  }
}
```

**Consumer (ON):**
```json
{
  "governance_analytics": { "recalculated": false, "confidence": 0.72, ... },
  "analytics_source": "event_governance",
  "pulse_own_preserved": { "pulse_index": 68, "domain_states": {} }
}
```

UX existente **inalterada** — campos aditivos apenas.

---

## Critérios activação

| Critério | Threshold |
|----------|-----------|
| ECO-03 shadow match | ≥ 85% |
| ECO-04 shadow match | ≥ 85% |
| ECO-05 shadow match | ≥ 85% |
| Estabilidade | 7 dias |
