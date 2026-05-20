# Operational Runtime Tuning — Implementação

## Objetivo

Tuning operacional supervisionado do runtime cognitivo — recomendações sem `auto_apply`.

## Módulos

`backend/src/runtimeTuning/`

| Módulo | Função |
|--------|--------|
| `runtimeOperationalTuning.js` | Agrega recomendações (delivery, enrichment, reasoning) |
| `runtimePressureAnalyzer.js` | Pressão, fatigue, overload |
| `deliveryOptimizationAdvisor.js` | Targeting, hierarchy, delivery |
| `enrichmentOptimizationAdvisor.js` | Stale, orphan, weak, duplicate enrichers |
| `runtimeEfficiencySupervisor.js` | Eficiência, overhead, cognitive load |
| `runtimeTuningFacade.js` | Facade |

Integra opcionalmente com Phase Y (`controlledRuntimeTuningAdvisor`).

## API

`/api/internal/runtime-tuning`

| GET | `/status`, `/efficiency`, `/pressure`, `/optimization`, `/enrichment`, `/report` |

## Flags

| Variável | Default |
|----------|---------|
| `IMPETUS_OPERATIONAL_RUNTIME_TUNING` | off |
| `IMPETUS_RUNTIME_TUNING_ADVISOR` | off |
| `IMPETUS_RUNTIME_TUNING_OBSERVABILITY` | on |

## Testes

```bash
npm run test:runtime-operational-tuning
```
