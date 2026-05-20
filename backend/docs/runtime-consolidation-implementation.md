# Gradual Runtime Consolidation — Implementação

## Objetivo

Análise supervisionada de redundâncias, legacy resolvers e dependências — **sem remoção automática**.

## Módulos

`backend/src/runtimeConsolidation/`

| Módulo | Função |
|--------|--------|
| `runtimeConsolidationAnalyzer.js` | Redundâncias, overlaps, shadow duplication |
| `legacyResolverAnalysis.js` | Heurísticas antigas, resolvers redundantes |
| `runtimeSimplificationAdvisor.js` | Recomendações de simplificação |
| `pipelineDependencyGraph.js` | Grafo de dependências + risk analysis |
| `runtimeConsolidationFacade.js` | Facade |

Reutiliza `pipelineConsolidationAdvisor` (Phase Y) quando disponível.

## API

`/api/internal/runtime-consolidation`

| GET | `/status`, `/redundancy`, `/legacy`, `/dependencies`, `/recommendations`, `/report` |

## Flags

| Variável | Default |
|----------|---------|
| `IMPETUS_RUNTIME_CONSOLIDATION` | off |
| `IMPETUS_LEGACY_REDUCTION_ANALYSIS` | off |
| `IMPETUS_RUNTIME_CONSOLIDATION_OBSERVABILITY` | on |

## Testes

```bash
npm run test:runtime-consolidation
```
