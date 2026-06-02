# Priority Queue Report (Fase 47-F)

**Função:** `buildOperationalPriorityQueue(equipment_ranking)`

---

## Ordenação

`priority_score DESC` — equipamento em 1º lugar = maior prioridade **observável** na análise.

---

## Estrutura

```json
{
  "queue": [
    { "position": 1, "equipment_id": "LAB-EQ-001", "priority_score": 78, "priority_level": "critical" }
  ],
  "top_equipment_id": "LAB-EQ-001",
  "ordering": "priority_score_desc"
}
```

---

## Rankings adicionais

- `event_ranking` — eventos não-NORMAL por score
- `pattern_ranking` — padrões `observed_pattern` por score
