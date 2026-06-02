# Operational Timeline Report (Fase 44-F)

**Função:** `buildOperationalTimeline(events)`

---

## Janelas

| Janela | Conteúdo |
|--------|----------|
| `24h` | Eventos com `window === '24h'` |
| `7d` | Eventos com `window === '7d'` |
| `30d` | Eventos com `window === '30d'` |

Cada lista ordenada por `observed_at` (mais recente primeiro).

---

## Estrutura de retorno

```json
{
  "windows": ["24h", "7d", "30d"],
  "timeline": {
    "24h": [ { "event_type": "SIGNAL_INSTABILITY", "equipment_id": "LAB-EQ-001", "..." } ],
    "7d": [],
    "30d": []
  },
  "event_count": 9,
  "generated_at": "2026-06-01T..."
}
```

---

## Uso

- `buildOperationalEventPack` expõe `timeline` no pacote
- Dashboard chat / `dataRetrievalService` — `operational_timeline`
- Histórico **apenas** de eventos já observados (auditável)
