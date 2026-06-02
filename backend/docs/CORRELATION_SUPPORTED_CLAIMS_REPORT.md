# Correlation Supported Claims (Fase 43-E)

---

## Permitido (`correlation_supported_claim`)

- Correlação forte/moderada **observada**
- Sinais variaram em conjunto
- Associação consistente na janela

Requer `correlation_pack` com pares auditáveis.

---

## Bloqueado (`forbidden_causality_claim`)

- «Temperatura **causa** vibração»
- «Corrente **provoca** falha»
- «RPM **gera** desgaste»
- «Causa raiz», «está causando»

Resposta: `UNSUPPORTED_OPERATIONAL_CLAIM`

---

## Evidence binding (43-I)

```json
{
  "claim_categories": [
    "telemetry_supported_claim",
    "trend_supported_claim",
    "anomaly_supported_claim",
    "correlation_supported_claim"
  ]
}
```
