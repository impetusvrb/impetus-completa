# OPM-002A — Inventory Foundation & Operational Intelligence

**Programa:** IMPETUS WMS Functional Evolution — Fase 2  
**Entrega:** OPM-002A  
**Data:** 2026-07-19  
**Fase módulo:** `OPM-002A`

---

## Objetivo

Iniciar a **evolução funcional do WMS** transformando Inventário de ecrã certificado (WMS-007A + frame genérico) em **centro de gestão operacional industrial**, sobre a baseline OPM-001D + EOX.

---

## Localização

`frontend/src/domains/logistics-operational/modules/inventory/`

| Componente | Função |
|------------|--------|
| `useInventoryFoundation.js` | Carga WMS-003 (items, balances, movements, warehouses) |
| `InventoryOperationalModule.jsx` | UI operacional (OPM-001A stack) |
| `inventoryKpiUtils.js` | 8 KPIs operacionais |
| `inventoryStockUtils.js` | Visão de estoque (merge item + balance) |
| `inventoryListUtils.js` | Pesquisa + filtros de status |
| `inventoryTimelineUtils.js` | Histórico por tipo e período |
| `inventoryExport.js` | CSV · Excel · PDF |
| `InventoryOperationalIntelligencePanel.jsx` | Heurísticas operacionais |
| `inventoryIntegrationContracts.js` | Contratos OPM-003+ (declarativo) |
| `inventoryObservability.js` | Eventos INVENTORY_* |

---

## APIs consumidas (WMS-003 v1 — sem alteração backend)

- `GET /inventory/items`
- `GET /inventory/balances`
- `GET /inventory/movements`
- `GET /warehouses` (label armazém)

---

## Funcionalidades entregues

### 1. Dashboard operacional (KPIs)

Total de itens · Disponíveis · Bloqueados · Divergências · Estoque mínimo · Crítico · Inventários pendentes · Última sincronização

### 2. Consulta operacional

Pesquisa: código, SKU, descrição, lote, série, endereço, armazém  
Filtros: Disponível · Reservado · Bloqueado · Quarentena · Expirado

### 3. Grid de estoque

Código · Produto · Lote · Série · Quantidade · Unidade · Endereço · Armazém · Status · Última movimentação  
Ordenação e paginação via `IndustrialDataGrid`

### 4. Inteligência operacional

Abaixo do mínimo · Divergências · Sem movimentação · Críticos · Estoque parado · Tendência ruptura

### 5. Timeline

Entrada · Saída · Transferência · Ajuste · Inventário · Reserva — filtros 7/30/90/tudo

### 6. Exportação

CSV · Excel (exceljs) · PDF (jspdf-autotable)

### 7. Observabilidade

`INVENTORY_LOADED` · `INVENTORY_FILTER` · `INVENTORY_SEARCH` · `INVENTORY_EXPORT` · `INVENTORY_TIMELINE` · `INVENTORY_VIEW_CHANGED`

---

## Preservação certificada

- EOX header / breadcrumb / navegação intactos
- OPM-001A framework (IndustrialModuleLayout)
- Warehouse OPM-001C inalterado
- Outros módulos WMS mantêm `WmsStandaloneModuleFrame`
- Zero alterações backend / RBAC / flags

---

## GAPs registados

| ID | Descrição |
|----|-----------|
| GAP-OPM-INV-001 | Série dedicada por balance |
| GAP-OPM-INV-002 | Export server-side |
| GAP-OPM-INV-003 | IA Cognitiva (OPM-008) |

**OPM-002A — COMPLETED**
