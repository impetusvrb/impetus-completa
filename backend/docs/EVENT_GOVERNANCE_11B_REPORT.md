# EVENT-GOVERNANCE-11B — Relatório de Implementação (SST)

**Data:** 2026-06-20  
**Origem:** EVENT-GOVERNANCE-01/02/03 · EG-04–11A  
**Modo:** expansão de domínio — shadow default  
**Escopo:** distribuição SST → Event Governance com escalonamento ocupacional (sem alterar workflow)

---

## Resumo executivo

Migrada **apenas a orquestração de distribuição** de alertas SST para Event Governance. CAT, acidentes, investigações, APR/PT, treinamentos, indicadores e workflows permanecem inalterados.

| Critério | Estado |
|----------|--------|
| `sstGovernanceAdapter` | **Implementado** |
| Política `SST_LIFECYCLE` | **Implementada** |
| `sstNotificationService` (produtor central) | **Implementado** |
| Escalonamento níveis 1–4 | **Implementado** |
| Integração `operationalAlertsService` | **Implementado** |
| Shadow comparison | **Implementado** |
| Fallback legado | **Implementado** |
| Flag `EVENT_GOVERNANCE_SST=false` | **Default** |
| Testes | **15/15** |

```json
{
  "sst_migrated": true,
  "sst_workflow_preserved": true,
  "escalation_supported": true,
  "shadow_mode_available": true,
  "fallback_available": true,
  "tests_passing": true
}
```

---

## Arquitectura

### Antes

```text
operationalAlertsService._dispatchOperationalAlert()
    ↓
operationalAlertsGovernanceAdapter (EG-04)
    ↓
notificationBridge / NC
```

### Depois (default — flag OFF)

```text
operationalAlertsService._dispatchOperationalAlert()
    ↓ isSstOperationalAlert() ?
sstNotificationService.dispatchFromOperationalAlert()
    ↓ _dispatchSstNotify()
sstGovernanceAdapter (shadow)
    ↓ compareShadow + runLegacyDistribution()
unifiedMessaging + bridgeExecutiveMessage (nível 4)
```

### Depois (flag ON)

```text
SST evento
    ↓
Event Governance → SST_LIFECYCLE
    ↓
sstGovernanceAdapter (governance mode)
    ↓
Notification Center / Dashboard / Chat / App Impetus
```

---

## Ficheiros criados/alterados

| Ficheiro | Acção |
|----------|-------|
| `docs/EVENT_GOVERNANCE_11B_SST_AUDIT.md` | Criado |
| `services/sstNotificationService.js` | Criado |
| `services/governanceAdapters/sstGovernanceAdapter.js` | Criado |
| `governance/eventPolicyCatalog.js` | `SST_LIFECYCLE` |
| `services/operationalAlertsService.js` | Roteamento SST |
| `services/eventGovernanceService.js` | `payload.escalationLevel` |
| `services/observabilityService.js` | Métricas SST |
| `services/featureGovernanceService.js` | `EVENT_GOVERNANCE_SST` |
| `routes/audit.js` | `GET /api/audit/event-governance/sst` |
| `tests/audit/EVENT_GOVERNANCE_11B_SST.test.js` | Criado |

---

## Escalonamento ocupacional

| Nível | Label |
|-------|-------|
| 1 | Supervisor |
| 2 | Supervisor + SST |
| 3 | Supervisor + SST + Gestão |
| 4 | Executive Mode (reutilizado) |

---

## Observabilidade

| Métrica | Descrição |
|---------|-----------|
| `event_governance_sst_events` | Eventos avaliados |
| `event_governance_sst_migrated` | Distribuídos via governance |
| `event_governance_sst_shadow_total` | Comparações shadow |
| `event_governance_sst_shadow_match` | Shadow alinhado |
| `event_governance_sst_shadow_divergence` | Shadow divergente |

---

## Sequência recomendada

```text
EG-11C → ESG (reutiliza escalonamento)
EG-12  → AIOI (eventos normalizados)
```
