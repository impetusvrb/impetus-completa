# Pattern History Report (Fase 45-G)

**Função:** `buildOperationalPatternHistory(patterns, events)`

---

## Janelas

`24h` · `7d` · `30d` · `90d`

- `24h` / `7d` / `30d`: padrões que incluem eventos na respectiva janela.
- `90d`: visão cumulativa de todos os padrões confirmados na análise.

---

## Estrutura

```json
{
  "windows": ["24h", "7d", "30d", "90d"],
  "history": {
    "24h": [ { "pattern_type": "RECURRING_SIGNAL_INSTABILITY", "occurrences": 3 } ],
    "90d": []
  },
  "isolated_events": [
    { "equipment_id": "X", "event_type": "...", "window": "24h", "isolated": true }
  ],
  "pattern_count": 4
}
```

---

## Pergunta suportada

«Esse comportamento já aconteceu antes?» — resposta baseada em `history` + `isolated_events`, sem prever repetição futura.
