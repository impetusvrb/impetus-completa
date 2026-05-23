# Z.M1 — Maintenance Adaptive Requirements

**Data:** 2026-05-23 · **Âmbito:** preparação — sem implementação

## Integração com Z.28

Manutenção nativa (Z.M1) deve consumir:

| Capability Z.28 | Uso em manutenção |
|-----------------|-------------------|
| `cognitiveFatigueAnalyzer` | fadiga PCM (alertas OS, backlog) |
| `adaptiveUsefulnessScorer` | utilidade MTBF/MTTR/preventiva |
| `adaptiveDensityGovernor` | ≤6 centros, ≤8 widgets |
| `adaptiveConvergenceRuntime` | correlação produção↔manutenção (interna) |
| `orchestrationRecommendationEngine` | sugestões supervisadas |

## Blocos + orchestration

- `maintenance.predictive_failure` → usefulness baixa se telemetria empty
- `maintenance.mtbf_mttr` → peso adaptativo por tier PCM
- `maintenance.downtime_correlation` → convergência com production (sem leakage visual)

## Invariantes Z.M1

- `auto_mutation_applied: false` sempre em shadow
- Telemetria graceful empty
- PM2 reload only

## Readiness

**Medium-high** após Z.28 — adaptive layer pronta para 7º domínio native.
