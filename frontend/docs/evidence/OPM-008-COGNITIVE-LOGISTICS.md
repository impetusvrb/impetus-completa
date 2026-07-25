# OPM-008 — Cognitive Logistics & Decision Intelligence

**Fase:** OPM-008  
**Papel:** Camada cognitiva da plataforma — preditiva, explicável, auditável  
**Pré-requisitos:** OPM-GOV-001 ✅ · OPM-007 ✅ · WMS-REF-001 ✅  
**Data:** 2026-07-19

---

## Posicionamento arquitectural

| Camada | Fase | Função |
|--------|------|--------|
| Transacional | OPM-003 – OPM-006 | Executa operações |
| Analítica | OPM-007 | Inteligência descritiva/diagnóstica |
| **Cognitiva** | **OPM-008** | Recomendações preditivas · simulação · decision trace |

OPM-008 **não contém regras de negócio WMS**. Consome contratos OPM-GOV-001 e inteligência OPM-007.

---

## Objetivos funcionais entregues

1. **Cognitive Dashboard** — Health Score, risco operacional, tendências, eficiência global
2. **Predictive Insights** — heurísticas explicáveis (saturação, filas, SLA, hotspots, lead time)
3. **Recommendation Engine** — prioridade, confiança, impacto, justificativa, evidências, módulos
4. **Decision Trace** — Recommendation → Evidence → Metrics → Events → Contracts
5. **Scenario Simulation** — what-if in-memory (sem efeitos colaterais)
6. **Unified Cognitive Timeline** — operacional + analítico + cognitivo + preditivo

---

## Componentes WMS-REF-001

Dashboard · Metrics · Search · Filters · Grid · Timeline · Export (adapt/direct)

---

## Consumo de dados

- **OPM-007 pipeline:** KPIs, heatmaps, capacity, bottlenecks, flow, recomendações WI
- **WMS-003 read-only:** warehouses, inventory, receiving, picking, shipping, transfers
- **OPM-GOV-001:** contratos declarativos (sem alteração)

---

## Observabilidade

`COGNITIVE_DASHBOARD_LOADED` · `COGNITIVE_INSIGHT_GENERATED` · `COGNITIVE_RECOMMENDATION_OPENED` · `COGNITIVE_SCENARIO_EXECUTED` · `COGNITIVE_TRACE_VIEWED` · `COGNITIVE_EXPORT`

---

## Invariantes

- Nenhuma operação transacional
- Nenhuma execução automática de recomendações
- Simulações sem alteração de estado
- Toda conclusão explicável via decision trace

---

## Localização

```
frontend/src/domains/logistics-operational/modules/cognitive-logistics/
```

Rota: `/app/logistics/cognitive-logistics`

---

## Testes

```bash
npm run test:opm008
npm run test:opm-logistics
```
