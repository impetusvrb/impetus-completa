# Event Confidence Report (Fase 44-I)

**Função:** `computeEventConfidence(evidence, context)`

---

## Significado

`event_confidence` (0–100) mede a **robustez da observação** — quantidade e consistência de evidências cruzadas (anomalia, correlação, alarme, tendência).

**Não é:** probabilidade de falha, score de IA ou previsão.

---

## Componentes (`eventIntelligenceConfig.js`)

| Factor | Efeito |
|--------|--------|
| Campos de evidência preenchidos | +base por chave (máx. 40) |
| Anomalia crítica | bónus |
| Correlação ≥ limiar forte | bónus |
| Alarme activo / escalada | bónus |
| Tendência ≠ stable | bónus |
| `attention_score` alto | +10 |

Teto: `max_score` (100).

---

## Exemplo

```json
{
  "event_type": "CORRELATED_DEVIATION",
  "event_confidence": 72,
  "evidence": {
    "correlation": 0.84,
    "anomaly": true,
    "observational_only": true,
    "no_prediction": true
  }
}
```
