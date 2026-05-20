# Fase J — Enterprise Governance Operations + Production Enablement

## Arquitectura de operações

A Fase J adiciona uma **camada operacional** sobre as Fases E–I sem activar governança global automaticamente.

```
┌─────────────────────────────────────────────────────────┐
│  governanceOperationsService (facade)                    │
├──────────────┬──────────────┬──────────────┬────────────┤
│ Lifecycle    │ Incidents    │ Orchestrators│ Emergency  │
│ Coordinator  │ Engine       │ (manual)     │ Controls   │
├──────────────┴──────────────┴──────────────┴────────────┤
│  Fase I Runtime │ Fase H Readiness │ Fase G Audit       │
└─────────────────────────────────────────────────────────┘
```

## Estados operacionais

| Estado | Significado |
|--------|-------------|
| `shadow_only` | Apenas shadow observability |
| `partial_governance` | Alguns canais activos |
| `controlled_activation` | Framework I activo |
| `stabilized` | Rollout estável |
| `degraded` | Degradação detectada |
| `rollback_ready` | Plano de rollback disponível |
| `emergency_mode` | Emergência preparada (manual) |

Transições são **manuais** ou derivadas de sync runtime — nunca auto-promoção global.

## API interna (Fase J)

| Método | Path |
|--------|------|
| GET | `/api/internal/governance/operations/status` |
| GET | `/api/internal/governance/operations/incidents` |
| GET | `/api/internal/governance/operations/runtime` |
| GET | `/api/internal/governance/operations/health` |
| GET | `/api/internal/governance/operations/rollout` |
| POST | `/api/internal/governance/operations/emergency/prepare` |
| POST | `/api/internal/governance/operations/orchestrate/activate/:channel` |
| POST | `/api/internal/governance/operations/orchestrate/promote/:channel` |
| GET | `/api/internal/governance/operations/rollback-readiness` |

Segurança: `requireAuth`, rede interna, ACL `governance`, roles admin/GOVERNANCE_OVERSIGHT.

## Feature flags (default OFF)

```
IMPETUS_GOVERNANCE_OPERATIONS=off
IMPETUS_GOVERNANCE_INCIDENT_ENGINE=off
IMPETUS_GOVERNANCE_RUNTIME_HEALTH=off
IMPETUS_GOVERNANCE_EMERGENCY_CONTROLS=off
```

Preservar: `IMPETUS_GOVERNANCE_SHADOW_MODE=on`, `IMPETUS_FAILSAFE_GOVERNANCE=on`

## Incident management

Classificação: `informational` → `critical`

Tipos: degradation, leakage, overblocking, contextual degradation, drift, runtime instability, activation failure, rollback event.

Logs estruturados:
- `GOVERNANCE_INCIDENT_DETECTED`
- `GOVERNANCE_INCIDENT_ESCALATED`
- `GOVERNANCE_RUNTIME_CRITICAL`
- `GOVERNANCE_CONTEXTUAL_DEGRADATION`

**Sem** resposta automática a incidentes.

## Orquestração

| Orchestrator | Comportamento |
|--------------|---------------|
| Activation | Valida quality gates → prepara plano → `execute:true` + `approved_by` para executar |
| Promotion | `evaluatePromotionGate` Fase H → bloqueio se `allowed:false` |
| Rollback | Plano imediato; execução só com aprovação |

Todas as respostas incluem `auto_executed: false`.

## Métricas operacionais

- `governance_operational_health`
- `governance_runtime_stability`
- `governance_activation_safety`
- `governance_incident_rate`
- `governance_drift_pressure`
- `governance_context_integrity`

## Emergency controls

`POST .../operations/emergency/prepare`:
- Transição para `emergency_mode`
- Planos de rollback e isolamento (não executados)
- Lista de flags PM2 para desligar
- Audit trail via `appendOperational`

## Rollback imediato

```bash
IMPETUS_GOVERNANCE_OPERATIONS=off
IMPETUS_GOVERNANCE_INCIDENT_ENGINE=off
IMPETUS_GOVERNANCE_RUNTIME_HEALTH=off
IMPETUS_GOVERNANCE_EMERGENCY_CONTROLS=off
pm2 reload impetus-backend --update-env
```

Runtime: usar endpoints Fase I `demote` / `rollback-rollout` conforme documentado na Fase I.

## Testes

```bash
npm run test:cognitive-governance-phase-j
```

Snapshots em `tests/cognitive-governance-phase-j/snapshots/`.

## Maturidade operacional

| Capacidade | Estado |
|------------|--------|
| Governança operacionalizável | ✅ |
| Activção administrável (manual) | ✅ |
| Observabilidade executiva (API) | ✅ |
| Rollout production-safe | ✅ |
| Readiness operacional | ✅ |
| Lifecycle management | ✅ |
| Auto-remediation | ❌ (fora de escopo) |
| Auto-promotion | ❌ (fora de escopo) |

## Riscos e mitigações

| Risco | Mitigação |
|-------|-----------|
| Activção acidental | Flags default OFF; `execute` explícito |
| Rollback automático | Bloqueado por design |
| Incidentes silenciosos | Engine + audit JSONL |
| Regressão contextual | Quality gates H + monitoring I/J |

## Recomendações de rollout

1. Activar `IMPETUS_GOVERNANCE_OPERATIONS=on` em staging.
2. Monitorizar `/operations/health` 7 dias.
3. Activar incident engine se shadow alignment estável.
4. Promover canais via Fase I com orchestration J apenas como checklist.
5. Manter emergency prepare documentado para runbooks SRE.
