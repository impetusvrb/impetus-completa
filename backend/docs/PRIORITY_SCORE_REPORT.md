# Priority Score Report (Fase 47-B/C)

**Função:** `computePriorityScore(components)`

---

## Significado

`priority_score` (0–100) = **importância operacional observável** na fila atual.

**Não é:** falha futura, risco de acidente, OEE, criticidade industrial absoluta.

---

## Fórmula (transparente)

```
score = round(
  0.30 × attention_score +
  0.20 × risk_score +
  0.20 × event_confidence +
  0.20 × pattern_confidence +
  0.10 × (100 - telemetry_health)
)
```

---

## Níveis

| Score | Nível |
|-------|-------|
| 0–25 | low |
| 26–50 | medium |
| 51–75 | high |
| 76–100 | critical |

Config: `backend/src/config/priorityIntelligenceConfig.js`
