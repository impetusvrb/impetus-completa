# Anomaly Supported Claims (Fase 42-E)

---

## Permitido (`anomaly_supported_claim`)

- Anomalia observada
- Desvio observado
- Comportamento fora do padrão observado
- Oscilação acima do baseline
- Queda abrupta observada

Requer `anomaly_pack` com evidência em `plc_collected_data`.

---

## Bloqueado (`forbidden_failure_prediction_claim`)

- Vai quebrar / vai falhar
- Falha iminente / quebra provável
- Necessita manutenção
- Vida útil reduzida
- Probabilidade de falha

---

## Evidence binding (42-H)

```json
{
  "claim_categories": [
    "telemetry_supported_claim",
    "trend_supported_claim",
    "anomaly_supported_claim"
  ]
}
```

Quando snapshot de anomalias válido.
