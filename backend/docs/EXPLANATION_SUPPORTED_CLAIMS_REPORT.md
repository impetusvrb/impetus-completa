# Explanation Supported Claims (Fase 46-E)

---

## Permitido (`explanation_supported_claim`)

- Classificado **devido às evidências observadas**
- Principal **contribuição observada** (ex.: vibração)
- Padrão sustentado por **múltiplas ocorrências**
- Explicação operacional / rastreabilidade

Requer `explanation_pack` com explicações auditáveis.

---

## Bloqueado (`forbidden_root_cause_claim`)

- «Sabemos a causa»
- «Foi provocado por»
- «A origem do problema é»
- «Causa raiz confirmada / identificada»

Também coberto por `forbidden_causality_claim` quando aplicável.

Resposta: `UNSUPPORTED_OPERATIONAL_CLAIM`

---

## Evidence binding (46-I)

```json
{
  "claim_categories": [
    "telemetry_supported_claim",
    "trend_supported_claim",
    "anomaly_supported_claim",
    "correlation_supported_claim",
    "event_supported_claim",
    "pattern_supported_claim",
    "explanation_supported_claim"
  ]
}
```
