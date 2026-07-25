# OPM-001C — GAP Matrix

**Data:** 2026-07-19

| ID | Funcionalidade | Prioridade | API necessária |
|----|----------------|------------|----------------|
| GAP-OPM-WH-006 | Edição de armazém | **Alta** | `PATCH /warehouses/:id` |
| GAP-OPM-WH-007 | Desactivação lógica | **Alta** | `PATCH /warehouses/:id/status` |
| GAP-OPM-WH-008 | Histórico dedicado | Média | `GET /warehouses/:id/history` |
| GAP-OPM-WH-001 | KPI capacidade agregada | Média | `GET /warehouses/summary` |
| GAP-OPM-WH-002 | Timeline API dedicada | Média | `GET /warehouses/:id/timeline` |
| GAP-OPM-WH-003 | Alertas centralizados | Baixa | `GET /warehouses/alerts` |
| GAP-OPM-WH-004 | Localização geográfica | Baixa | Extensão contrato |
| GAP-OPM-WH-005 | Export server-side | Baixa | `GET /warehouses/export` |

Registo: `warehouseGapRegistry.js`

**Política:** nenhum GAP implementado automaticamente no backend.
