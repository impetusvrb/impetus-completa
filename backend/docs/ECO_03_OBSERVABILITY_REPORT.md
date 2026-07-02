# ECO-03 — Relatório de Observabilidade

**Fase:** 3 · **Data:** 2026-07-02

---

## Métricas por fluxo

| Métrica | Descrição |
|---------|-----------|
| `eco_convergence_oae_shadow_total` | Avaliações shadow OAE |
| `eco_convergence_oae_migrated_total` | Execuções governance OAE |
| `eco_convergence_oae_shadow_match` | Shadow match OAE |
| `eco_convergence_oae_shadow_divergence` | Divergências OAE |
| `eco_convergence_chat_*` | Idem chat realtime |
| `eco_convergence_org_ai_*` | Idem org AI |
| `eco_chat_operational_events` | Total eventos adapter CHAT_OPERATIONAL |
| `eco_nc_bridge_mirror_events` | Total eventos NC_BRIDGE_MIRROR |

---

## Endpoint audit

```
GET /api/audit/eco-convergence/status
```

Resposta inclui:
- `flags` — estado ECO_OAE / ECO_CHAT / ECO_ORG_AI
- `flows` — shadow_total, migrated_total, avg_legacy_ms, avg_governance_ms
- `adapters.chat_operational` — eventos avaliados
- `adapters.nc_bridge_mirror` — eventos avaliados

---

## Comparação baseline

| Campo baseline | Comparação pós-migração |
|----------------|-------------------------|
| `metrics.event_governance_*` | Deve manter tendência (shadow incrementa evaluations) |
| `health.ok` | Deve permanecer true |
| `ecoConvergence.flows.*.avg_legacy_ms` | Referência tempo anterior |
| `ecoConvergence.flows.*.avg_governance_ms` | Tempo posterior (flag ON) |

Gerar baseline:

```bash
node scripts/eco/eco-03-baseline-snapshot.js
```

---

## Logs estruturados

| Componente | Prefixo |
|------------|---------|
| operationalActionExecutor | `[OPERATIONAL_ACTION_EXECUTOR]` |
| operationalRealtimeCoordinator | `[OPER_REALTIME]` |
| organizationalAI | `[ORG_AI]` |
| adapters | `[chatOperationalGovernanceAdapter]` |

Campos adicionais em modo governance: `policyId`, `mode: governance|shadow`.

---

## Shadow mode (flags OFF)

Com flags OFF, **cada dispatch**:
1. Invoca `evaluatePrepareAndExecute`
2. Executa legacy (comportamento funcional preservado)
3. Compara decisão EG vs legacy
4. Regista métricas de match/divergence

Isto permite observabilidade **antes** da activação sem alterar UX.

---

## Critérios de activação flag

| Critério | Threshold |
|----------|-----------|
| Shadow match rate | ≥ 85% (amostra ≥ 50 eventos) |
| Erros legacy | 0 regressões vs baseline |
| Health/deep health | OK 7 dias |
| Divergências críticas | 0 P0 abertas |

---

## Evidências

[`evidence/eco-03/`](./evidence/eco-03/) — baseline JSON + certificação test output
