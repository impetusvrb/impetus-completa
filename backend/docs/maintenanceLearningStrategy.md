# Z.M1 — Maintenance Learning Strategy

**Data:** 2026-05-23

## Integração Z.29

| Learning Z.29 | Manutenção Z.M1 |
|---------------|-----------------|
| `usefulnessTrendAnalyzer` | MTBF/MTTR usefulness |
| `fatigueLearningRuntime` | alertas OS / backlog fatigue |
| `convergenceLearningRuntime` | downtime ↔ produção |
| `governanceRecommendationEngine` | sugestões PCM supervisadas |

## Sinais a aprender

- predictive_failure confidence
- preventive_overdue recurrence
- machine degradation slope
- maintenance_open trend

## Invariantes

- `auto_mutation_applied: false`
- Persistência tenant-scoped JSON
- Integração adaptive Z.28 antes do learning

## Readiness

**High** — após Z.29, adaptive + learning prontos para 7º domínio.
