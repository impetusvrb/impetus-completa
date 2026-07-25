# OPM-001B — KPI Coverage

**Data:** 2026-07-19

| KPI | Fonte API | Status OPM-001B |
|-----|-----------|-----------------|
| Total armazéns | `listWarehouses` | ✅ Real |
| Capacidade utilizada | `warehouseCapacity` · location_count agregado | ✅ Real quando API responde |
| Capacidade disponível | capacity_units − utilizada | ⚠️ GAP-OPM-WH-001 se metadata sem capacity_units |
| Itens armazenados | `listBalances` · distinct item_id | ✅ Real |
| Movimentações (30d) | `listMovements` · filtro client-side created_at | ✅ Real |
| Alertas operacionais | Heurística status inactive/maintenance | ⚠️ GAP-OPM-WH-003 · sem API alerts |

**Política:** valores indisponíveis exibem **"Dados indisponíveis"** — nunca mock ou Math.random().
