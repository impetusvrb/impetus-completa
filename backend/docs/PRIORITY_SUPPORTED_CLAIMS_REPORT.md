# Priority Supported Claims (Fase 47-E)

---

## Permitido (`priority_supported_claim`)

- Maior **prioridade observável**
- Prioridade operacional **elevada**
- Merece atenção **primeiro** (na fila)
- Resulta da **combinação das evidências** observadas

Requer `priority_pack` com `equipment_ranking`.

---

## Bloqueado (`forbidden_priority_prediction_claim`)

- «É o mais perigoso»
- «Vai falhar primeiro»
- «Deve quebrar»
- «Mais crítico da planta»

Resposta: `UNSUPPORTED_OPERATIONAL_CLAIM`

---

## Evidence binding (47-I)

```json
{
  "claim_categories": [
    "telemetry_supported_claim",
    "trend_supported_claim",
    "anomaly_supported_claim",
    "correlation_supported_claim",
    "event_supported_claim",
    "pattern_supported_claim",
    "explanation_supported_claim",
    "priority_supported_claim"
  ]
}
```
