# Pattern Detection Report (Fase 45-B)

**Função:** `detectOperationalPatterns()` / `detectOperationalPatternsFromEvents()`

---

## Classes

| Padrão | Origem (evento F44) |
|--------|------------------------|
| `RECURRING_SIGNAL_INSTABILITY` | `SIGNAL_INSTABILITY` |
| `RECURRING_ALARM_ESCALATION` | `ALARM_ESCALATION` |
| `RECURRING_CORRELATED_DEVIATION` | `CORRELATED_DEVIATION` |
| `RECURRING_TELEMETRY_DEGRADATION` | `TELEMETRY_DEGRADATION` |
| `RECURRING_ATTENTION_EVENT` | `EQUIPMENT_ATTENTION_*` |
| `STABLE_OPERATION_PATTERN` | `NORMAL_OPERATION` |
| `OBSERVED_REPETITIVE_BEHAVIOR` | `OBSERVED_OPERATIONAL_CHANGE` |

---

## Critério de recorrência

- Mínimo **2 ocorrências** do mesmo tipo por equipamento (`min_occurrences_recurring`).
- Evento **isolado** (1 ocorrência) **não** gera padrão (`observed_pattern: false` implícito — ausente do array).
- Apenas repetição **já observada** nas janelas 24h / 7d / 30d.

---

## Deduplicação

Agrupamento por `equipment_id | pattern_type`; confiança e severidade calculadas no grupo.
