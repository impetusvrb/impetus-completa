# ECO-03 — Migração Controlada de Bypasses P0/P1

**Programa:** Cognitive Ecosystem Convergence  
**Fase:** 3 — Primeira implementação de convergência  
**Data:** 2026-07-02  
**Tipo:** Certificação de implementação controlada

---

## Decisão global

**CERTIFICADO COM RESSALVAS**

| Fluxo | Decisão | Flag | Modo actual |
|-------|---------|------|-------------|
| `operationalActionExecutor` | MIGRADO COM RESSALVAS | `ECO_OAE_VIA_EG` | Shadow (OFF) |
| `operationalRealtimeCoordinator` | MIGRADO COM RESSALVAS | `ECO_CHAT_VIA_EG` | Shadow (OFF) |
| `organizationalAI.notifyRecipients` | MIGRADO COM RESSALVAS | `ECO_ORG_AI_VIA_EG` | Shadow (OFF) |
| Políticas órfãs CHAT_OPERATIONAL | MIGRADO | — | Adapter criado |
| Políticas órfãs NC_BRIDGE_MIRROR | MIGRADO | — | Adapter criado |

**Ressalva:** flags iniciam OFF — bypass legacy continua funcional; Event Governance avaliado em shadow para observabilidade. Activação em produção requer restart PM2 **uma flag de cada vez**.

---

## Objectivo

Eliminar bypasses P0/P1 identificados em ECO-01 e formalizados em ECO-02, fazendo com que fluxos operacionais passem pelo Event Governance v1 via adapters, com rollback independente por fluxo.

---

## Baseline (PARTE 1)

```bash
cd backend
node scripts/eco/eco-03-baseline-snapshot.js
```

Captura: `/health`, `/api/system/health/deep`, PM2, métricas EG, flags ECO, audit eco-convergence.

Evidências: [`evidence/eco-03/`](./evidence/eco-03/)

---

## Alterações implementadas

### Adapters (PARTE 2)

| Adapter | Política | Ficheiro |
|---------|----------|----------|
| CHAT_OPERATIONAL | `CHAT_OPERATIONAL` / `AI_PROACTIVE` (org) | `governanceAdapters/chatOperationalGovernanceAdapter.js` |
| NC_BRIDGE_MIRROR | `NC_BRIDGE_MIRROR` | `governanceAdapters/ncBridgeMirrorGovernanceAdapter.js` |

### Produtores migrados (PARTE 3)

| Produtor | Integração |
|----------|------------|
| `operationalActionExecutor.js` | `sendOperationalNotification()` → adapter |
| `operationalRealtimeCoordinator.js` | `notifyUsers()` → adapter |
| `organizationalAI.js` | `notifyRecipients()` → adapter |

### Feature flags (PARTE 4)

| Flag | Default | Rollback |
|------|---------|----------|
| `ECO_OAE_VIA_EG` | `false` | `false` + restart |
| `ECO_CHAT_VIA_EG` | `false` | `false` + restart |
| `ECO_ORG_AI_VIA_EG` | `false` | `false` + restart |

Serviço: `services/ecoConvergenceFlags.js`

---

## Infraestrutura preservada

Event Governance v1, Learning, Memory, Explainability, Intelligence, Policy Optimization, Executive Insights, Knowledge Base — **sem alterações**.

APIs públicas e DTOs — **sem alterações**.

---

## NCs

| NC | Estado pós-ECO-03 |
|----|-------------------|
| NC-INT-004 | **Fechada** (adapter + flag; activação pendente) |
| NC-INT-005 | **Fechada** (adapters órfãos criados) |
| NC-ECO-03-001 | Aberta — activação gradual flags em staging |

---

## Certificação

```bash
cd backend
node src/tests/audit/ECO_03_BYPASS_MIGRATION.test.js
```

---

## Próximo passo

**ECO-04** — Cognitive Controller Consumer (ADR-ECO-001), após activação estável das flags ECO-03 em staging.
