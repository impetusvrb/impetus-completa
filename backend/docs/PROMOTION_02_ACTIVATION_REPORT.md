# PROMOTION-02 — Relatório de Ativação Controlada

**Gerado:** 2026-07-02T02:13:57.051Z
**Decisão global:** PROMOTION SUCCESSFUL

---

## Baseline

- Health: 200 (1820ms)
- Deep health ready: true
- PM2 impetus-backend: restarts=510

## Ativações graduais

| # | Componente | Flag | Restart | Pipeline ms | Decisão |
|---|------------|------|---------|-------------|---------|
| 1 | aioi | EVENT_GOVERNANCE_AIOI | 427ms | 16.08 | **ONLINE** |
| 2 | learning | EVENT_GOVERNANCE_LEARNING | 730ms | 0.87 | **ONLINE** |
| 3 | memory | EVENT_GOVERNANCE_MEMORY | 408ms | 0.86 | **ONLINE** |
| 4 | explainability | EVENT_GOVERNANCE_EXPLAINABILITY | 393ms | 1.13 | **ONLINE** |
| 5 | intelligence | EVENT_GOVERNANCE_INTELLIGENCE | 416ms | 1.66 | **ONLINE** |
| 6 | policy_optimization | EVENT_GOVERNANCE_POLICY_OPTIMIZATION | 320ms | 2.03 | **ONLINE** |
| 7 | executive_insights | EVENT_GOVERNANCE_EXECUTIVE_INSIGHTS | 399ms | 1.48 | **ONLINE** |
| 8 | knowledge_base | EVENT_GOVERNANCE_KNOWLEDGE_BASE | 376ms | 2.61 | **ONLINE** |

## NCs

Nenhuma NC aberta nesta execução.

## Flags proibidas (não activadas)

- `EVENT_GOVERNANCE_ENABLED` = false
- `EVENT_GOVERNANCE_EXECUTION_ENABLED` = false
- `EVENT_GOVERNANCE_OPERATIONAL_ALERTS` = false
- `EVENT_GOVERNANCE_AI_PROACTIVE` = false
- `EVENT_GOVERNANCE_TPM` = false
- `EVENT_GOVERNANCE_EXECUTIVE` = false
- `EVENT_GOVERNANCE_BILLING` = false
- `EVENT_GOVERNANCE_DSR` = false
- `EVENT_GOVERNANCE_MANUIA` = false
- `EVENT_GOVERNANCE_QUALITY` = false
- `EVENT_GOVERNANCE_SST` = false
- `EVENT_GOVERNANCE_ESG` = false

## Recomendação produção

Replicar **a mesma sequência gradual** (8 etapas individuais) em produção após janela de manutenção. Backup `.env` criado: `.env.pre-promotion-02-*`.

**Não activar em produção ainda:** `EVENT_GOVERNANCE_ENABLED`, `EVENT_GOVERNANCE_EXECUTION_ENABLED`, flags domínio EG-04→11.

## Consolidação (estado final Grupo A)

| Componente | Antes | Depois | Decisão |
|------------|-------|--------|---------|
| AIOI | OFF | **ONLINE** | ONLINE |
| Learning | OFF | **ONLINE** | ONLINE |
| Memory | OFF | **ONLINE** | ONLINE |
| Explainability | OFF | **ONLINE** | ONLINE |
| Intelligence | OFF | **ONLINE** | ONLINE |
| Policy Optimization | OFF | **ONLINE** | ONLINE |
| Executive Insights | OFF | **ONLINE** | ONLINE |
| Knowledge Base | OFF | **ONLINE** | ONLINE |

**Rollbacks executados:** nenhum  
**NCs abertas:** nenhuma  
**Tempo total:** ~2 min (8 restarts PM2)

## Script de re-execução

```bash
cd backend
node scripts/promotion/promotion-02-controlled-activation.js --baseline
PROMOTION_02_EXECUTE=1 node scripts/promotion/promotion-02-controlled-activation.js --execute
```