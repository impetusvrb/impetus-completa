# Trend Supported Claims (Fase 41-D)

**Camada:** `industrialTruthEnforcementService.js`

---

## Categorias

| Categoria | Uso |
|-----------|-----|
| `trend_supported_claim` | Aumento/redução/estabilidade **observada** com trend snapshot |
| `forbidden_predictive_claim` | Bloqueio de previsões sem evidência MES |

---

## Permitido

- Aumento observado / redução observada / estabilidade observada
- Degradação ou melhoria **observável** (com % do snapshot)
- Risk score como atenção observável (não «vai falhar»)

---

## Bloqueado (`FORBIDDEN_PREDICTIVE_CLAIM_RE`)

- vai falhar / quebra iminente / manutenção obrigatória
- falha provável / quebra prevista / previsão de parada
- risco iminente / probabilidade de falha

Resposta: `UNSUPPORTED_OPERATIONAL_CLAIM`

---

## Evidence Binding (41-F)

```json
{
  "claim_categories": [
    "telemetry_supported_claim",
    "trend_supported_claim"
  ]
}
```

Quando `telemetry_only` + trend snapshot válido.
