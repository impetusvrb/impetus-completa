# Event Supported Claims (Fase 44-E)

---

## Permitido (`event_supported_claim`)

- Evento de instabilidade operacional **observada**
- Escalada de alarmes **detectada**
- Recuperação da telemetria **observada**
- Alteração operacional relevante **observada**

Requer `event_pack` com eventos auditáveis (`plc_collected_data`). Perguntas sobre «o que aconteceu» com telemetria no dossiê activam classificação quando o texto cita equipamento ou linguagem observacional.

---

## Bloqueado (`forbidden_event_prediction_claim`)

- «Vai falhar», «vai parar», «irá parar»
- «Ocorrerá uma falha», «falha futura»
- «Linha irá parar», «equipamento irá quebrar»
- «Quebra iminente», «parada iminente»
- «Causa raiz identificada»

Resposta: `UNSUPPORTED_OPERATIONAL_CLAIM` (também coberto por `forbidden_failure_prediction_claim` / `forbidden_predictive_claim` quando aplicável).

---

## Evidence binding (44-J)

```json
{
  "claim_categories": [
    "telemetry_supported_claim",
    "trend_supported_claim",
    "anomaly_supported_claim",
    "correlation_supported_claim",
    "event_supported_claim"
  ]
}
```
