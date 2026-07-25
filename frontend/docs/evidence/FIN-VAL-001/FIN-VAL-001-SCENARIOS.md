# FIN-VAL-001 — Exception scenarios

**Fonte:** `platform/validation/finance/scenarios/finValScenarios.js`

| ID | Cenário | Expectativa |
|----|---------|-------------|
| EX-FIN-001 | Aumento abrupto de custos | Variance / efficiency reflectem spike; KPIs Hub actualizam |
| EX-FIN-002 | Perda financeira (Leakage) | `economic_losses` > 0; risco Twin elevado; decisões compõem |
| EX-FIN-003 | Mudança de driver de custo | Contribuições / unit cost recalculam; trace actualizado |
| EX-FIN-004 | Alteração valuation estoque | lotCosts / attrs via `wms_valuation` |
| EX-FIN-005 | Fonte indisponível | Soft-fail; `parallelTwin: false`; sem throw |

## Aceite

`validateFinValScenarios()` + finding `exceptions` no harness = PASS
