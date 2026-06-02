# Interaction Score Report (Fase 43-F)

**Função:** `computeEquipmentInteractionScore()` — independente de `risk_score` e `attention_score`.

---

## Significado

Mede **quantidade de associações estatísticas fortes** observadas entre sinais — não risco, não falha, não previsão.

---

## Pesos (`correlationBaselineConfig.js`)

- very_strong: +25 por par (máx. 6 pares)
- strong: +15
- moderate: +8

---

## Níveis

| Score | Nível |
|-------|-------|
| 0–25 | normal |
| 26–60 | elevated |
| 61–100 | high |

---

## Exemplo com correlações detectadas

```json
{
  "equipment_id": "LAB-EQ-001",
  "interaction_score": 40,
  "interaction_level": "elevated",
  "strong_pairs_count": 1,
  "no_causality_inferred": true
}
```

Com sinais constantes no piloto, `correlation_count` pode ser 0 — o motor permanece válido e reporta interaction_score 0.
