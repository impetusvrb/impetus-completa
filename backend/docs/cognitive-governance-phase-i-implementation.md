# Fase I — Controlled Governance Activation + Enterprise Rollout

## Estratégia de activação

A governança **não** é ligada globalmente por defeito. Dois caminhos coexistem:

| Modo | Como activa | Rollback |
|------|-------------|----------|
| **Env legado** | `IMPETUS_KPI_GOVERNANCE=on` etc. | `pm2 reload` com flag off |
| **Runtime controlado** | `IMPETUS_CONTROLLED_GOVERNANCE_ACTIVATION=on` + `POST .../activate/:channel` | `POST .../demote/:channel` (sem rebuild) |

## Fluxo de promoção

```
POST /api/internal/governance/activate/:channel
    ↓
governanceActivationValidator (quality gates Fase H)
    ↓
governancePromotionTracker
    ↓
tenantGovernancePromotion (se TENANT_SAFE=on)
    ↓
phaseFFeatureFlags.is*Enabled(user) → true para esse tenant/canal
    ↓
Canais F (KPI/chat/summary/boundary) aplicam governança
```

`auto_executed: false` em todas as respostas.

## Ordem de rollout recomendada

1. KPI (`/activate/kpi`)
2. Summary (`/activate/summary`)
3. Chat (`/activate/chat`)
4. Boundary (`/activate/boundary`)

Validar shadow 7 dias entre passos.

## API interna (Fase I)

| Método | Path |
|--------|------|
| GET | `/api/internal/governance/activation/status` |
| GET | `/api/internal/governance/activation/rollback-readiness` |
| GET | `/api/internal/governance/activation/rollout-plan` |
| POST | `/api/internal/governance/activate/:channel` |
| POST | `/api/internal/governance/demote/:channel` |
| POST | `/api/internal/governance/activation/rollback-rollout` |

## Feature flags Fase I (default OFF)

```
IMPETUS_CONTROLLED_GOVERNANCE_ACTIVATION=off
IMPETUS_RUNTIME_GOVERNANCE_MONITORING=off
IMPETUS_TENANT_SAFE_GOVERNANCE=off
```

Preservar: `IMPETUS_GOVERNANCE_SHADOW_MODE=on`, `IMPETUS_FAILSAFE_GOVERNANCE=on`

## Rollback imediato

```bash
# Runtime (sem rebuild)
curl -X POST .../activation/rollback-rollout -d '{"scope":"phase_f_only"}'

# Master framework
IMPETUS_CONTROLLED_GOVERNANCE_ACTIVATION=off
IMPETUS_KPI_GOVERNANCE=off
IMPETUS_SUMMARY_GOVERNANCE=off
IMPETUS_CHAT_GOVERNANCE=off
IMPETUS_COGNITIVE_BOUNDARY_GUARD=off
pm2 reload impetus-backend --update-env
```

## Runtime monitoring

Com `IMPETUS_RUNTIME_GOVERNANCE_MONITORING=on`:

- `governance_runtime_health`
- `activation_stability_score`
- `runtime_overblocking_rate`
- Logs: `GOVERNANCE_RUNTIME_DEGRADED`, `CHAT_LEAKAGE_PREVENTED`, etc.

## Tenant-safe

Com `IMPETUS_TENANT_SAFE_GOVERNANCE=on`:

- Promoção por `tenant_id`
- Tenant B não herda activação de Tenant A
- Isolamento em `tenantActivationIsolation.js`

## Quality gates (obrigatório)

Activar canal bloqueado se:

- Quality gate Fase H falhar
- `leakage_risk === high`
- `drift_stability === unstable`
- `readiness_score < 75` (configurável no POST)

## Testes

```bash
npm run test:cognitive-governance-phase-i
npm run test:cognitive-governance-phase-h
```

Snapshots: `backend/tests/cognitive-governance-phase-i/snapshots/`

## Riscos e mitigações

| Risco | Mitigação |
|-------|-----------|
| Activar tudo de uma vez | Runtime passo-a-passo + tenant isolation |
| Sem rollback | demote + coordinator plan |
| Regressão UX | Flags off = legacy; shadow on |
| Bypass quality gate | validateActivationRequest obrigatório |

## Production readiness

| Critério | Estado |
|----------|--------|
| Controlled activation | Implementado |
| Auto global activation | **Não implementado** |
| Env + runtime dual path | Sim |
| Audit trail activations | `appendActivation` |
| UX impact default | **Nenhum** |

## Exemplo de promoção tenant KPI

```bash
# 1. Ligar framework (staging)
IMPETUS_CONTROLLED_GOVERNANCE_ACTIVATION=on
IMPETUS_TENANT_SAFE_GOVERNANCE=on
IMPETUS_GOVERNANCE_QUALITY_GATES=on

# 2. Promover (API interna, role governança)
POST /api/internal/governance/activate/kpi
{ "tenant_id": "<uuid-empresa>" }

# 3. Verificar
GET /api/internal/governance/activation/status?tenant_id=<uuid>
```

Não define `IMPETUS_KPI_GOVERNANCE=on` globalmente — apenas o tenant promovido recebe governança KPI em runtime.
