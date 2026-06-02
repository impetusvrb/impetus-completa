# Event Classification Report (Fase 44-B)

**Função:** `detectOperationalEvents()` / `detectOperationalEventsForEquipment()`

---

## Classes de evento

| Tipo | Origem (evidência) |
|------|---------------------|
| `NORMAL_OPERATION` | Sem desvio nas camadas 41–43 |
| `TELEMETRY_DEGRADATION` | `telemetry_health` / cobertura abaixo do limiar |
| `TELEMETRY_RECOVERY` | Saúde recuperada + coleta contínua |
| `SIGNAL_INSTABILITY` | Anomalias observadas (Fase 42) |
| `CORRELATED_DEVIATION` | Correlação forte + anomalia ou tendência (Fase 43) |
| `ALARM_ESCALATION` | `alarm_active` / anomalia em `alarm_state` |
| `EQUIPMENT_ATTENTION_REQUIRED` | `attention_score` ≥ limiar |
| `EQUIPMENT_ATTENTION_CRITICAL` | `attention_score` crítico ou anomalia crítica |
| `OBSERVED_OPERATIONAL_CHANGE` | Tendência não estável (Fase 41) |

---

## Severidade (44-D)

Mapeada em `eventIntelligenceConfig.severity_map` — baseada em:

- `attention_score`
- classificação de anomalia
- actividade de alarme

**Nunca** em previsão de falha.

---

## Deduplicação

Chave: `equipment_id | event_type | window | signals` — ordenação por `event_confidence` descendente.
