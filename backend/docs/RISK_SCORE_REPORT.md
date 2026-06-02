# Risk Score Report (Fase 41-C)

**Função:** `computeEquipmentRiskScore()` — **observacional**, não preditivo.

---

## Escala 0–100

| Nível | Score |
|-------|-------|
| `normal` | 0–25 |
| `warning` | 26–50 |
| `critical` | 51–100 |

---

## Fontes permitidas (pesos em `trendBaselineConfig.js`)

- Crescimento de vibração observado
- Crescimento de temperatura observado
- Alarmes (`alarm_frequency`)
- Degradação saúde telemetria (< 75)
- Queda de cobertura (< 0,85)

---

## Proibido

Probabilidade de falha, vida útil, previsão, manutenção preditiva.

---

## Exemplo piloto

```json
{
  "equipment_id": "LAB-EQ-001",
  "risk_score": 0,
  "risk_level": "normal",
  "observational_only": true
}
```
