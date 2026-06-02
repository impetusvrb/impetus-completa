# Attention Score Report (Fase 42-D)

**Função:** `computeEquipmentAttentionScore()` — independente do `risk_score` (Fase 41).

---

## Interpretação

| Score | Nível | Significado |
|-------|-------|-------------|
| 0–25 | `normal` | Situação actual calma |
| 26–50 | `elevated` | Desvios ou alarmes observáveis |
| 51–100 | `critical` | Múltiplas anomalias críticas |

---

## Pesos (`anomalyBaselineConfig.js`)

- `critical_anomaly`: +40
- `anomaly`: +25
- `attention`: +12
- alarmes activos: +20

---

## Exemplo piloto

```json
{
  "equipment_id": "LAB-EQ-001",
  "attention_score": 40,
  "attention_level": "elevated",
  "observational_only": true
}
```

Risk score pode permanecer baixo (tendência histórica estável) enquanto attention_score sobe (situação actual).
