# SUPPLY — Promotion Metrics

**Programa:** GF-025  
**Módulo:** `supplyPromotionMetrics.js`

---

## Métricas registadas

| Métrica | Descrição |
|---------|-----------|
| `blocks_received` | Blocos cognitivos recebidos do resolver |
| `blocks_promoted` | Blocos com policy `PROMOTION_ELIGIBLE` |
| `blocks_rejected` | Blocos rejeitados (binding/signal/integrity) |
| `avg_duration_ms` | Tempo médio por execução `runSupplyPromotion` |
| `promotion_success_rate` | promoted / (promoted + rejected) |
| `promotion_failure_rate` | rejected / (promoted + rejected) |
| `runs` | Total execuções acumuladas (in-memory) |

---

## API snapshot

```javascript
getPromotionMetricsSnapshot() → {
  blocks_received, blocks_promoted, blocks_rejected,
  avg_duration_ms, promotion_success_rate, promotion_failure_rate, runs
}
```

---

## Razões de rejeição (policy)

| Reason | Condição |
|--------|----------|
| `NOT_COGNITIVE_BLOCK` | block_id inválido |
| `BINDING_FAILED` | binding_ok false |
| `ZERO_SIGNAL` | signal_count ≤ 0 |
| `DUPLICATE_BLOCK` | deduplicado no resolver |
| `INVALID_BLOCK_INTEGRITY` | fora de SUPPLY_SEMANTIC_BLOCK_IDS |
| `PROMOTION_DISABLED` | gate config off |

---

*Teste:* `npm run test:supply-promotion`
