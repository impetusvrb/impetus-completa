# Recurrence intelligence (Quality cognitive)

## Motor

`qualityRecurrenceAnalysisEngine.js` — agregação por `(entity_type, entity_id, kind)` dentro de janela temporal; clusters por intervalo médio.

## Eventos

- `quality.cognitive.recurrence_detected`
- `quality.cognitive.pattern_detected` quando contagem dominante ≥ limiar configurável no orquestrador

## Uso

`signals.recurrence_records[]` com `occurred_at` ISO ou timestamp parseável.
