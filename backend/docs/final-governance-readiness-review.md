# Etapa Final A/B — Integrated Governance Review + Runtime Validation

## Objectivo

Validação integrada e readiness operacional **sem** novas foundations, **sem** activação global automática e **sem** alteração de UX.

## Arquitectura

```
finalReview/                    runtimeValidation/
├── integratedGovernanceReview  ├── governanceRuntimeValidation
├── governanceCoverageAudit     ├── shadowRuntimeValidator
├── governanceRegressionAudit   ├── governanceLatencyValidator
├── governanceHealthAssessment  ├── governancePerformanceValidator
├── governanceReadinessFinalizer├── rolloutSafetyValidator
└── assessments (ops/stability) └── activationSafetyAssessment
```

## API interna

| Método | Path |
|--------|------|
| GET | `/api/internal/governance/final/review` |
| GET | `/api/internal/governance/final/runtime-validation` |
| GET | `/api/internal/governance/final/health` |
| GET | `/api/internal/governance/final/coverage` |
| GET | `/api/internal/governance/final/rollout-safety` |
| GET | `/api/internal/governance/final/report` |

## Feature flags (default OFF)

```
IMPETUS_FINAL_GOVERNANCE_REVIEW=off
IMPETUS_RUNTIME_VALIDATION=off
IMPETUS_ROLLOUT_SAFETY_VALIDATION=off
```

Preservar: `IMPETUS_GOVERNANCE_SHADOW_MODE=on`, `IMPETUS_FAILSAFE_GOVERNANCE=on`

## Score final (exemplo)

```json
{
  "governance_health": 94,
  "runtime_stability": "stable",
  "shadow_alignment": 0.97,
  "leakage_risk": "low",
  "overblocking_risk": "low",
  "rollout_readiness": "safe_gradual_activation",
  "production_status": "enterprise_ready"
}
```

## Cobertura auditada

Dashboard, KPI, summary, chat, boundary, contextual modules, explainability, oversight, drift, audit feed, readiness, quality gates, controlled activation, operations, incident engine, rollout orchestration, telemetry/shadow.

## Runtime validation

- Shadow divergence (`RUNTIME_SHADOW_DIVERGENCE`)
- Overblocking (`RUNTIME_OVERBLOCKING_DETECTED`)
- Degradation (`RUNTIME_DEGRADATION_DETECTED`)
- Latency thresholds por canal (chat 120ms, KPI 45ms, summary 80ms, etc.)

## Ordem de rollout supervisionado

1. KPI (baixa sensibilidade)
2. Summary
3. Chat
4. Boundary

7 dias de shadow entre passos; quality gates Fase H obrigatórios.

## Rollback

```bash
IMPETUS_FINAL_GOVERNANCE_REVIEW=off
IMPETUS_RUNTIME_VALIDATION=off
IMPETUS_ROLLOUT_SAFETY_VALIDATION=off
pm2 reload impetus-backend --update-env
```

Runtime: Fase I `demote` / `rollback-rollout` + flags de canal off.

## Testes

```bash
npm run test:final-governance-review
```

## Maturidade enterprise

| Critério | Validação |
|----------|-----------|
| Integração E→J | `governanceRegressionAudit` |
| Coverage gaps | `governanceCoverageAudit` |
| Health score | `governanceReadinessFinalizer` |
| Rollout safety | `rolloutSafetyValidator` |
| Auto-activation | Bloqueado em todas as respostas |

## Recomendações de activação

1. Executar `GET /final/report?force=1` em staging com flags finais ON.
2. Confirmar `production_status` ≥ `production_candidate`.
3. Activar canais via Fase I um a um (nunca global).
4. Monitorizar `/final/runtime-validation` durante 7 dias por canal.
5. Manter emergency prepare (Fase J) documentado em runbook.

## Riscos

| Risco | Mitigação |
|-------|-----------|
| Regressão silenciosa | `FINAL_GOVERNANCE_REGRESSION_DETECTED` |
| Latency | Thresholds em `governanceLatencyMetrics` |
| Leakage residual | Shadow review + anomaly detector |
| Rollout inseguro | `rollout_readiness` + quality gates |
