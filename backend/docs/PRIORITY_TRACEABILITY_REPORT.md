# Priority Traceability Report (Fase 47-J)

Cada item priorizado inclui `traceability` com valores **brutos** usados no cálculo:

```json
{
  "attention_score": 58,
  "risk_score": 32,
  "event_confidence": 65,
  "pattern_confidence": 70,
  "telemetry_health": 85,
  "telemetry_urgency_component": 15,
  "weights_applied": {
    "attention_score": 0.3,
    "risk_score": 0.2,
    "event_confidence": 0.2,
    "pattern_confidence": 0.2,
    "telemetry_health": 0.1
  }
}
```

`contributors[]` lista apenas componentes com valor > 0 no agregado do equipamento.

Sem pesos ocultos — `weights_documented` também no `priority_pack`.
