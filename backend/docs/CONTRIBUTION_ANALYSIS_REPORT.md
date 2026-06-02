# Contribution Analysis Report (Fase 46-D)

**Função:** `buildOperationalContributionAnalysis(ctx)`

---

## Métricas suportadas

| Métrica | Origem dos pesos |
|---------|------------------|
| `attention_score` | Pontos em `anomalyBaselineConfig.attention_score` por classificação de anomalia + alarme |
| `risk_score` | Factores de `computeEquipmentRiskScore` (trend pack) |
| `event_confidence` | Chaves de evidência do evento |
| `pattern_confidence` | Ocorrências + janelas |

---

## Exemplo

```json
{
  "target": "attention_score",
  "contributions": [
    { "signal": "vibration", "metric": "attention_score", "contribution_percent": 60 },
    { "signal": "alarm_state", "metric": "attention_score", "contribution_percent": 25 }
  ],
  "scores": { "attention_score": 58 },
  "no_inference": true
}
```

Percentagens = `raw_points / total` — **sem inferência causal**.
