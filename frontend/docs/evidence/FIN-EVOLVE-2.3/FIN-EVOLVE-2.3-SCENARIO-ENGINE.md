# FIN-EVOLVE-2.3 — Scenario Composition Engine

**Fonte:** `domains/finance/whatif/scenario-engine/`

## APIs

| Função | Papel |
|--------|-------|
| `createWhatIfScenario` | Cria contexto isolado (`scenarioId`) a partir do baseline clonado |
| `setWhatIfParameter` | Actualiza hipótese só neste cenário |
| `calculateWhatIfScenario` | Corre Engine 2.1 (+ Twin 2.2) em baseline e simulado |
| `discardWhatIfScenario` | Remove o contexto do registry em memória |
| `clearAllWhatIfScenarios` | Housekeeping / unmount da view |

## Isolamento

- Cada cenário tem `scenarioId` único e mapa próprio no registry
- Hipóteses de A não influenciam B
- Baseline operacional nunca é mutado (`baselineUntouched`)
- `persistence: false` · `mutatesOperational: false`

## Consumidores apenas

Economic Intelligence Engine · Financial Twin State Provider · contratos READY / dashboard
