# Fase H — Governance Readiness + Controlled Activation Framework

## Objetivo

Validar maturidade da governança cognitiva **antes** de activação real em produção — **sem auto-activation**.

## Arquitetura

```
Shadow telemetry (F) + Traces (G)
    ↓
governanceReadinessEngine
    ├─ governanceFalsePositiveAnalyzer
    ├─ governanceOverblockingDetector
    ├─ governanceStabilityEvaluator
    └─ governanceRiskAnalyzer
    ↓
governanceQualityGate → governancePromotionGate
    ↓
governanceActivationPlanner (recomendações apenas)
    ↓
governanceRollbackCoordinator (plano documentado)
```

## Scores produzidos

| Score | Uso |
|-------|-----|
| `readiness_score` | 0–100 maturidade global |
| `activation_safety_score` | Segurança de rollout |
| `governance_maturity_score` | Cobertura E/F/G |
| `tenant_readiness_score` | Por empresa |
| `governance_false_positive_rate` | Falsos bloqueios |
| `governance_overblocking_rate` | Bloqueio excessivo |
| `governance_context_preservation_rate` | Contexto útil preservado |

## Exemplo de relatório

```json
{
  "readiness_score": 87,
  "shadow_alignment_rate": 0.96,
  "leakage_risk": "low",
  "overblocking_risk": "medium",
  "drift_stability": "stable",
  "activation_recommendation": "partial_activation_safe",
  "auto_activation": false
}
```

## Ordem de activação recomendada (manual)

1. `IMPETUS_KPI_GOVERNANCE`
2. `IMPETUS_SUMMARY_GOVERNANCE`
3. `IMPETUS_CHAT_GOVERNANCE`
4. `IMPETUS_COGNITIVE_BOUNDARY_GUARD`
5. `IMPETUS_GOVERNANCE_OVERSIGHT`
6. `IMPETUS_GOVERNANCE_EXPLAINABILITY`
7. `IMPETUS_GOVERNANCE_DRIFT_DETECTION`

Foundation (após shadow estável): Policy engine, Envelope, Sanitizer.

## Quality gates (bloqueio de promoção)

Activar com `IMPETUS_GOVERNANCE_QUALITY_GATES=on`.

Bloqueia se:
- `shadow_alignment_rate` < 92%
- `governance_confidence_score` < 80%
- `governance_false_positive_rate` > 8%
- `governance_overblocking_rate` > 12%
- `leakage_risk` = high
- `drift_stability` = unstable

## API interna

| GET | Path |
|-----|------|
| ✓ | `/api/internal/governance/readiness` |
| ✓ | `/api/internal/governance/readiness/tenant/:tenantId` |
| ✓ | `/api/internal/governance/activation-plan` |
| ✓ | `/api/internal/governance/quality-gates` |

Requer auth + rede interna + role governança.

## Feature flags (default OFF)

```
IMPETUS_GOVERNANCE_READINESS=off
IMPETUS_GOVERNANCE_QUALITY_GATES=off
IMPETUS_GOVERNANCE_ACTIVATION_PLANNER=off
IMPETUS_GOVERNANCE_FALSE_POSITIVE_ANALYZER=off
```

Preservar:
- `IMPETUS_GOVERNANCE_SHADOW_MODE=on`
- `IMPETUS_FAILSAFE_GOVERNANCE=on`

## Rollback

```bash
IMPETUS_GOVERNANCE_READINESS=off
IMPETUS_GOVERNANCE_QUALITY_GATES=off
IMPETUS_GOVERNANCE_ACTIVATION_PLANNER=off
IMPETUS_GOVERNANCE_FALSE_POSITIVE_ANALYZER=off
pm2 reload impetus-backend --update-env
```

Coordenação completa: `GET /api/internal/governance/quality-gates?rollback_scope=full_governance`

## Testes

```bash
npm run test:cognitive-governance-phase-h
npm run test:cognitive-governance-phase-g
npm run test:cognitive-governance-phase-f
```

## ISO/IEC 42001:2023

| Princípio | Fase H |
|----------|--------|
| Accountability | Readiness + promotion gates |
| Oversight | Tenant risk profile + review signals |
| Monitoring | FP/overblocking/drift metrics |
| Records | Activation plan exportável via API |
| Human oversight | `manual_confirmation_required: true` sempre |

## Maturity assessment

| Dimensão | Estado |
|----------|--------|
| Readiness scoring | Implementado (flag) |
| Controlled activation | Plano manual only |
| Auto-activation | **Proibido / não implementado** |
| Produção default | Zero impacto UX |

## Limitações

- Métricas derivadas de telemetria in-memory + shadow sintético em testes
- Sem persistência PostgreSQL de readiness histórico
- Sem UI de activação

## Rollout strategy

1. `IMPETUS_GOVERNANCE_READINESS=on` staging — observar scores 7 dias
2. `IMPETUS_GOVERNANCE_FALSE_POSITIVE_ANALYZER=on` — validar FP rate
3. `IMPETUS_GOVERNANCE_QUALITY_GATES=on` — bloquear promoções inseguras
4. `IMPETUS_GOVERNANCE_ACTIVATION_PLANNER=on` — gerar planos por tenant
5. Activar flags F **manualmente** passo a passo após gate pass
