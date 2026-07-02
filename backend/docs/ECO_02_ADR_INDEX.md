# ECO-02 — Índice de ADRs de Convergência

**Programa:** Cognitive Ecosystem Convergence  
**Fase:** 2 — Certificação arquitectural  
**Data:** 2026-07-02  
**Baseline:** Event Governance v1 congelado · Grupo A ONLINE

---

## Decisão

Estes ADRs constituem o **contrato definitivo** para todas as fases ECO-03 a ECO-08. Nenhuma implementação de integração pode contradizer ou antecipar uma ADR sem revisão formal do programa ECO.

---

## ADRs de convergência

| ADR | Título | Fase | Ficheiro |
|-----|--------|------|----------|
| ADR-ECO-001 | Controller Consumer | ECO-04 | [`adrs/ADR-ECO-001-controller-consumer.md`](./adrs/ADR-ECO-001-controller-consumer.md) |
| ADR-ECO-002 | Pulse Consumer | ECO-05 | [`adrs/ADR-ECO-002-pulse-consumer.md`](./adrs/ADR-ECO-002-pulse-consumer.md) |
| ADR-ECO-003 | Executive Consumer | ECO-07 | [`adrs/ADR-ECO-003-executive-consumer.md`](./adrs/ADR-ECO-003-executive-consumer.md) |
| ADR-ECO-004 | Knowledge Base Integration | ECO-06 | [`adrs/ADR-ECO-004-knowledge-base-integration.md`](./adrs/ADR-ECO-004-knowledge-base-integration.md) |
| ADR-ECO-005 | Legacy Adapter Retirement | ECO-08 | [`adrs/ADR-ECO-005-legacy-adapter-retirement.md`](./adrs/ADR-ECO-005-legacy-adapter-retirement.md) |

---

## ADRs Enterprise relacionados (não alterados)

| ADR | Relação com ECO |
|-----|-----------------|
| ADR-005 Event Backbone Núcleo Permanente | Backbone permanece; ECO-05 adiciona bridge publisher, não remove backbone |
| ADR-004 Serviços Cognitivos Externos | LLM permanece opcional; Controller consome EG antes de council |

---

## Sequência de aplicação

```text
ECO-02 (este índice) — contrato congelado
    ↓
ECO-03 — bypasses (pré-requisito de ADR-ECO-001)
    ↓
ECO-04 — ADR-ECO-001
    ↓
ECO-05 — ADR-ECO-002
    ↓
ECO-06 — ADR-ECO-004
    ↓
ECO-07 — ADR-ECO-003
    ↓
ECO-08 — ADR-ECO-005
```

---

## Referências

- [`ECO_02_CONVERGENCE_ARCHITECTURE.md`](./ECO_02_CONVERGENCE_ARCHITECTURE.md)
- [`ECO_01_PARALLEL_FLOWS_INVENTORY.md`](./ECO_01_PARALLEL_FLOWS_INVENTORY.md)
- [`EVENT_GOVERNANCE_CERTIFICATION_V1.md`](./EVENT_GOVERNANCE_CERTIFICATION_V1.md)
