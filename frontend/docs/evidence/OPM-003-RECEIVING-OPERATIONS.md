# OPM-003 — Receiving Operations & Inbound Logistics

**Fase:** OPM-003  
**Papel:** Porta de entrada operacional do WMS  
**Pré-requisitos:** OPM-002A ✅ · WMS-REF-001 ✅  
**Data:** 2026-07-19

---

## Objetivo

Implementar Receiving Operations como **porta de entrada do fluxo logístico** — todo material que entra no WMS nasce aqui e alimenta Inventário, Qualidade, Armazéns, Picking e Expedição.

---

## Componentes WMS-REF-001 (reutilização)

| Componente | Modo | Uso |
|------------|------|-----|
| InventoryDashboard | adapt | KPIs inbound |
| InventoryMetrics | adapt | ReceivingOperationalIntelligencePanel |
| InventorySearch | direct | Pesquisa ASN/fornecedor/PO |
| InventoryFilters | adapt | Estados ASN operacionais |
| InventoryGrid | adapt | RECEIVING_GRID_COLUMNS |
| InventoryTimeline | adapt | Filtros operador/doca/fornecedor |
| InventoryExport | direct | CSV/Excel/PDF |

---

## Funcionalidades

1. **Dashboard** — previstos, concluídos, conferência, docas, SLA, quarentena, inspeção
2. **ASN** — estados via metadata + status WMS-003
3. **Docas** — locations `dock` + painel operacional
4. **Conferência física** — metadata.lines no painel detalhes
5. **Conferência documental** — flags metadata (invoice, ASN, PO, certificados)
6. **Qualidade** — contratos PPAP/inspeção/quarentena (sem regras)
7. **Inventário** — POST movement `receipt` + PATCH status completed
8. **Timeline** — eventos derivados de metadata + lifecycle
9. **Inteligência** — atrasos, gargalos doca, divergências, SLA

---

## APIs WMS-003

- `GET /receiving`
- `POST /receiving`
- `PATCH /receiving/:id/status`
- `GET /warehouses/:id/locations` (docas)
- `POST /inventory/movements` (integração estoque)

---

## Observabilidade

`RECEIVING_LOADED` · `RECEIVING_ASN_CREATED` · `RECEIVING_DOCK_ASSIGNED` · `RECEIVING_INSPECTION_STARTED` · `RECEIVING_DIVERGENCE` · `RECEIVING_COMPLETED` · `RECEIVING_TIMELINE` · `RECEIVING_EXPORT`

---

## GAPs

Ver `receivingGapRegistry.js` — metadata PATCH ASN (GAP-OPM-RCV-001).

---

## Testes

```bash
npm run test:opm003
```
