# OPM-004 — Picking Operations & Order Fulfillment

**Fase:** OPM-004  
**Papel:** 1ª etapa Order Fulfillment · separação operacional  
**Pré-requisitos:** OPM-003 ✅ · WMS-REF-001 ✅  
**Data:** 2026-07-19

---

## Objetivo

Implementar Picking Operations como execução operacional da separação de materiais — primeira etapa do atendimento de pedidos, integrada ao fluxo:

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

1. **Dashboard** — pendentes, em separação, concluídas, SLA, produtividade, tempo médio, pendências, excepções
2. **Gestão de ordens** — consulta, pesquisa, filtros, priorização, ondas, rotas
3. **Picking Waves** — onda, individual, lote, zona (visualização)
4. **Rotas** — sequência, locais, distância, progresso
5. **Execução** — iniciar, pausar (observabilidade), concluir, divergências
6. **Integração Inventário** — movement `pick` + complete
7. **Timeline** — ordem criada/liberada/início/pausa/divergência/conclusão
8. **Inteligência** — congestionamento, produtos, rotas, SLA operador

---

## APIs WMS-003

- `GET /picking`
- `POST /picking`
- `POST /picking/:id/execute`
- `POST /picking/:id/complete`
- `POST /inventory/movements`

---

## Observabilidade

`PICKING_LOADED` · `PICKING_ORDER_ASSIGNED` · `PICKING_STARTED` · `PICKING_PAUSED` · `PICKING_COMPLETED` · `PICKING_DIVERGENCE` · `PICKING_ROUTE_VIEWED` · `PICKING_EXPORT`

---

## Testes

```bash
npm run test:opm004
```
