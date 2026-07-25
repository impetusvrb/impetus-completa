# OPM-005 — Shipping Control & Outbound Logistics

**Fase:** OPM-005  
**Papel:** Consolidação, conferência, carregamento e expedição — conclusão Order Fulfillment  
**Pré-requisitos:** OPM-004 ✅ · WMS-REF-001 ✅  
**Data:** 2026-07-19

---

## Objetivo

Implementar Shipping Control & Outbound Logistics como módulo responsável pela expedição de pedidos, fechando o fluxo outbound iniciado no Picking:

```
Recebimento → Inventário → Armazéns → Picking → Expedição (OPM-005)
```

---

## Componentes WMS-REF-001

| Componente | Modo |
|------------|------|
| InventoryDashboard | adapt |
| InventoryMetrics | adapt |
| InventorySearch | direct |
| InventoryFilters | adapt |
| InventoryGrid | adapt |
| InventoryTimeline | adapt |
| InventoryExport | direct |

---

## Funcionalidades

1. **Dashboard de Expedição** — prontas, carregadas, expedidas, SLA, carregamentos em andamento, docas ocupadas, transportes aguardando, excepções, tempo médio de carregamento
2. **Gestão de Ordens** — consulta, pesquisa, filtros, priorização, agrupamento por carga/transportadora
3. **Consolidação de Carga** — volumes, pallets, containers, carga por veículo, ocupação
4. **Conferência Final** — volumes, documental, divergências, faltas, substituições, aprovação
5. **Gestão de Carregamento** — doca, veículo, transportadora, operador, início/conclusão, tempo
6. **Integração Picking** — consumo ordens concluídas; expedição finaliza ordem + movement `issue` + timeline
7. **Timeline** — ordem recebida, conferência, divergência, carregamento, expedição concluída
8. **Inteligência Operacional** — atraso, utilização docas, tempo médio, divergências por transportadora, produtividade operador, SLA cliente

---

## Estados Operacionais

| Estado | Descrição |
|--------|-----------|
| awaiting_picking | Aguardando Picking |
| ready | Pronta |
| inspecting | Em Conferência |
| loading | Carregando |
| shipped | Expedida |
| cancelled | Cancelada |

---

## APIs WMS-003

- `GET /shipping`
- `POST /shipping`
- `GET /shipping/:id`
- `POST /shipping/:id/dispatch`
- `GET /picking` (handoff)
- `POST /inventory/movements` (movement_type: `issue`)
- `GET /warehouses/:id/locations` (docas saída)

---

## Observabilidade

`SHIPPING_LOADED` · `SHIPPING_ORDER_RECEIVED` · `SHIPPING_LOADING_STARTED` · `SHIPPING_LOADING_COMPLETED` · `SHIPPING_DISPATCHED` · `SHIPPING_DIVERGENCE` · `SHIPPING_TIMELINE` · `SHIPPING_EXPORT`

---

## Localização

```
frontend/src/domains/logistics-operational/modules/shipping/
frontend/src/domains/logistics-operational/pages/standalone/ShippingModulePage.jsx
```

---

## Testes

```bash
npm run test:opm005
```
