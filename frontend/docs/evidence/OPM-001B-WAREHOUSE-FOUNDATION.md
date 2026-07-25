# OPM-001B — Warehouse Foundation

**Programa:** Operational Product Maturity (OPM)  
**Entrega:** OPM-001B — Warehouse Foundation  
**Camada:** Presentation only  
**Data:** 2026-07-19  
**Pré-requisito:** OPM-001A — Industrial Operational Module Standard

---

## Declaração de conformidade

```
PRESENTATION_ONLY                  = YES
BACKEND_MODIFIED                   = NO
API_MODIFIED                       = NO
OPM-001A_MODIFIED                  = NO
WMS-007A_FRAME_MODIFIED            = NO
OTHER_WMS_MODULES_MODIFIED         = NO
```

---

## Objectivo

Transformar o módulo **Armazéns** de shell técnico em módulo operacional funcional, utilizando o framework OPM-001A e consumindo exclusivamente APIs WMS-003 v1 existentes.

---

## Entregáveis

| Área | Implementação |
|------|---------------|
| Dashboard operacional | 6 KPIs reais / indisponível |
| Listagem | Pesquisa, filtros status, sort, paginação, selecção, refresh |
| Exportação | CSV client-side (GAP-OPM-WH-005) |
| Painel detalhes | getWarehouse + capacity + locations |
| Timeline | Movimentos filtrados por armazém |
| Estados | IndustrialModuleStates + mensagens operacionais |
| Observabilidade | logWmsUiEvent WH_* events |
| GAPs | 5 lacunas documentadas |

---

## Localização

```
frontend/src/domains/logistics-operational/modules/warehouse/
├── WarehouseOperationalModule.jsx
├── WarehouseDetailsPanel.jsx
├── useWarehouseFoundation.js
├── useWarehouseDetail.js
├── warehouseKpiUtils.js
├── warehouseListUtils.js
├── warehouseOperationalMessages.js
├── warehouseGapRegistry.js
├── warehouseExport.js
├── warehouseColumns.jsx
└── warehouse-module.css
```

Page: `pages/standalone/WarehouseModulePage.jsx`

---

## APIs consumidas (existentes)

- `GET /warehouses`
- `GET /warehouses/:id`
- `GET /warehouses/:id/capacity`
- `GET /warehouses/:id/locations`
- `GET /inventory/balances`
- `GET /inventory/movements`

---

## Parecer

**OPM-001B — COMPLETED**
