# Pattern Supported Claims (Fase 45-E)

---

## Permitido (`pattern_supported_claim`)

- Padrão recorrente **observado**
- Recorrência observada
- Comportamento operacional repetitivo
- Evento ocorreu repetidamente

Requer `pattern_pack` com padrões `observed_pattern: true`.

---

## Bloqueado (`forbidden_pattern_prediction_claim`)

- «Vai acontecer novamente»
- «Voltará a ocorrer»
- «É inevitável»
- «Vai piorar»
- «Causa raiz encontrada»

Resposta: `UNSUPPORTED_OPERATIONAL_CLAIM`

---

## Evidence binding (45-J)

```json
{
  "claim_categories": [
    "telemetry_supported_claim",
    "trend_supported_claim",
    "anomaly_supported_claim",
    "correlation_supported_claim",
    "event_supported_claim",
    "pattern_supported_claim"
  ]
}
```
