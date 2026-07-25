# OPM-001B — GAP Matrix

**Data:** 2026-07-19

| ID | Funcionalidade | Dependência | Impacto | API necessária |
|----|----------------|-------------|---------|----------------|
| GAP-OPM-WH-001 | KPI capacidade disponível agregada | Summary endpoint ou capacity_units em metadata | KPI "Capacidade disponível" indisponível | `GET /warehouses/summary` |
| GAP-OPM-WH-002 | Timeline operacional dedicada | Event stream por armazém | Timeline usa movimentos de inventário | `GET /warehouses/:id/timeline` |
| GAP-OPM-WH-003 | Alertas operacionais centralizados | Serviço de alertas WMS | Alertas derivados de status local | `GET /warehouses/alerts` |
| GAP-OPM-WH-004 | Localização geográfica | Campos address no contrato Warehouse | Localização via metadata ou indisponível | Extensão contrato Warehouse |
| GAP-OPM-WH-005 | Exportação server-side | Export endpoint | CSV gerado no cliente | `GET /warehouses/export` |

Registo canónico: `warehouseGapRegistry.js`
