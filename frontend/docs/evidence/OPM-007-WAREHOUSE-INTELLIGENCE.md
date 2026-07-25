# OPM-007 — Warehouse Intelligence & Operational Optimization

**Fase:** OPM-007  
**Papel:** Camada analítica read-only — observa, mede, correlaciona, recomenda  
**Pré-requisitos:** OPM-GOV-001 ✅ · WMS-REF-001 ✅ · OPM-003–006 ✅  
**Data:** 2026-07-19

---

## Princípio arquitectural

Warehouse Intelligence **não executa operações**. Consolida dados produzidos por:

| Módulo | Fase | Papel |
|--------|------|-------|
| Receiving | OPM-003 | Executa inbound |
| Inventory | OPM-002A | Posição e movimentos |
| Picking | OPM-004 | Separação |
| Shipping | OPM-005 | Expedição |
| Transfer | OPM-006 | Logística interna |

Transforma sinais operacionais em KPIs, heatmaps, gargalos, fluxo e recomendações **informativas**.

---

## Objetivos funcionais entregues

1. **Operational Intelligence Dashboard** — KPIs consolidados (ocupação, zonas, bins, capacidade, giro, throughput, filas, SLA, eficiência, congestionamento)
2. **Heatmaps Operacionais** — zonas/bins mais movimentados, congestão, subutilização (preparado para mapas gráficos)
3. **Capacity Analytics** — capacidade disponível/crítica, tendência saturação
4. **Operational Bottlenecks** — gargalos Receiving, Picking, Transfer, Shipping
5. **Warehouse Performance** — produtividade operador, replenishment, cross-dock, transferências
6. **Flow Analytics** — correlação Receiving → Inventory → Transfer → Picking → Shipping
7. **Operational Recommendations** — regras explicáveis com `trace` rastreável (sem acção automática)
8. **Timeline Analítica** — eventos consolidados com filtros armazém/operador/período/domínio

---

## Componentes WMS-REF-001

| Componente | Modo |
|------------|------|
| Dashboard | adapt |
| Metrics | adapt |
| Search | direct |
| Filters | adapt |
| Grid | adapt |
| Timeline | adapt |
| Export | direct |

---

## APIs WMS-003 (consumo read-only)

- `GET /warehouses` · `GET /warehouses/:id/capacity`
- `GET /inventory/balances` · `GET /inventory/movements`
- `GET /receiving` · `GET /picking` · `GET /shipping` · `GET /transfers`

Agregação client-side — sem API dedicada `GET /warehouse/intelligence` (GAP documentado para OPM-008).

---

## Observabilidade

`WAREHOUSE_INTELLIGENCE_LOADED` · `WAREHOUSE_HEATMAP_VIEWED` · `WAREHOUSE_BOTTLENECK_DETECTED` · `WAREHOUSE_CAPACITY_ANALYZED` · `WAREHOUSE_RECOMMENDATION_OPENED` · `WAREHOUSE_ANALYTICS_FILTER` · `WAREHOUSE_EXPORT` · `WAREHOUSE_FLOW_ANALYZED`

---

## Invariantes

- Não cria movimentos de estoque
- Não altera estados operacionais
- Não modifica contratos certificados OPM-GOV-001
- Recomendações rastreáveis até dados de origem

---

## Localização

```
frontend/src/domains/logistics-operational/modules/warehouse-intelligence/
frontend/src/domains/logistics-operational/pages/standalone/WarehouseIntelligenceModulePage.jsx
```

Rota: `/app/logistics/warehouse-intelligence`

---

## Testes

```bash
npm run test:opm007
npm run test:opm-logistics   # platform + OPM-006 + OPM-007
```
