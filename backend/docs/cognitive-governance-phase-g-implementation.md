# Fase G — Human Oversight + Explainability Governance

## Arquitetura

```
Decisão (E/F channel)
    ↓
governanceTraceBridge (flags G off → no-op)
    ↓
governanceExplainabilityEngine → exposureReason / policyDecisionExplainer
    ↓
governanceTraceService → storage + timeline
    ↓
cognitiveGovernanceAuditFeed (JSONL append-only)
    ↓
governanceOversightService → conflicts + drift + review queue
```

## Módulos

| Área | Ficheiros |
|------|-----------|
| Explainability | `backend/src/explainability/*` |
| Trace | `backend/src/governanceTrace/*` |
| Oversight | `backend/src/oversight/*` |
| Audit | `backend/src/audit/*` |
| Shadow review+ | `policyEngine/observability/governanceShadowReview.js` |
| API interna | `routes/internal/cognitiveGovernancePhaseG.js` |

## API interna (requer auth + internal network + role governança)

| Método | Path |
|--------|------|
| GET | `/api/internal/governance/explain/:traceId` |
| GET | `/api/internal/governance/timeline/:userId` |
| GET | `/api/internal/governance/drift` |
| GET | `/api/internal/governance/metrics` |
| GET | `/api/internal/governance/audit/export` |

## Feature flags (default OFF)

| Flag | Default |
|------|---------|
| `IMPETUS_GOVERNANCE_EXPLAINABILITY` | off |
| `IMPETUS_GOVERNANCE_TRACE` | off |
| `IMPETUS_GOVERNANCE_OVERSIGHT` | off |
| `IMPETUS_GOVERNANCE_DRIFT_DETECTION` | off |
| `IMPETUS_GOVERNANCE_AUDIT_FEED` | off |

Shadow Fase F: permanece **on** (`IMPETUS_GOVERNANCE_SHADOW_MODE`).

## Rollback

```bash
IMPETUS_GOVERNANCE_EXPLAINABILITY=off
IMPETUS_GOVERNANCE_TRACE=off
IMPETUS_GOVERNANCE_OVERSIGHT=off
IMPETUS_GOVERNANCE_DRIFT_DETECTION=off
IMPETUS_GOVERNANCE_AUDIT_FEED=off
pm2 reload impetus-backend --update-env
```

## ISO/IEC 42001:2023 alignment

| Requisito | Cobertura Fase G |
|-----------|------------------|
| Accountability | `trace_id` + audit JSONL |
| Oversight | Review queue + escalation (observacional) |
| Explainability | `human_summary` + `winning_layer` |
| Monitoring | Drift + shadow metrics |
| Records | Append-only audit feed |

## Testes

```bash
npm run test:cognitive-governance-phase-g
npm run test:cognitive-governance-phase-f
npm run test:cognitive-governance
```

Snapshots: `backend/tests/cognitive-governance-phase-g/snapshots/`

## Limitações

- Storage in-memory (ring buffer) — não substitui SIEM persistente; JSONL em `data/governance-audit/`
- Sem UI de revisão humana
- Sem workflow HITL obrigatório
- APIs só para perfis internos/auditoria

## Maturity

| Dimensão | Nível |
|----------|-------|
| Explainability | Foundation ready (flag) |
| Traceability | Foundation ready (flag) |
| Oversight | Observational |
| Produção default | **Sem impacto UX** (flags off) |

## Rollout

1. Shadow on (já activo) — validar `COGNITIVE_GOVERNANCE_SHADOW_REVIEW`
2. `IMPETUS_GOVERNANCE_TRACE=on` em staging
3. `IMPETUS_GOVERNANCE_EXPLAINABILITY=on`
4. Audit feed para compliance
5. Oversight + drift em monitorização interna
