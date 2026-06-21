# EVENT-GOVERNANCE-06 — Relatório de Implementação (TPM)

**Data:** 2026-06-20  
**Origem:** EVENT-GOVERNANCE-04/05 · EG-01/02/03  
**Modo:** migração gradual — shadow default  
**Escopo:** TPM → Event Governance (único produtor nesta fase)

---

## Resumo executivo

Migrado `tpmNotifications.notifyTpmIncident()` para delegar a decisão de distribuição ao Event Governance, preservando App Impetus, bridge NC-03, regras de criticidade e persistência opcional em `alerts`.

| Critério | Estado |
|----------|--------|
| `tpmGovernanceAdapter` | **Implementado** |
| Integração `notifyTpmIncident()` | **Implementado** |
| Shadow comparison | **Implementado** |
| Fallback legado | **Implementado** |
| Flag `EVENT_GOVERNANCE_TPM=false` | **Default** |
| Testes | **15/15** |

```json
{
  "tpm_migrated": true,
  "shadow_mode_available": true,
  "feature_flag_present": true,
  "existing_behavior_preserved": true,
  "governance_controlling_distribution": true,
  "tests_passing": true
}
```

---

## Arquitectura

### Default (shadow — flag OFF)

```text
notifyTpmIncident()
    ↓
dispatchTpmIncident() → shadow compare
    ↓
runLegacyDistribution() → App Impetus + bridgeTpmIncident
    ↓
maybePersistAlertRow() [inalterado]
```

### Migrado (flag ON)

```text
notifyTpmIncident()
    ↓
dispatchTpmIncident() → evaluatePrepareAndExecute()
    ↓
executePlan() → appImpetusExecutor + notificationCenterExecutor
    ↓
maybePersistAlertRow() [inalterado]
```

Política: **`TPM_CRITICAL`** → `app_impetus`, `notification_center`, escalation 2.

---

## Flag

| Variável | Default | Comportamento |
|----------|---------|---------------|
| `EVENT_GOVERNANCE_TPM=false` | **Sim** | Shadow + legado |
| `EVENT_GOVERNANCE_TPM=true` | — | Governance controla distribuição |

Execução real: `EVENT_GOVERNANCE_EXECUTION_ENABLED=true`.

---

## Shadow comparison

Compara legado vs governance:

- severidade (severity/priority/perdas via `isTpmIncidentCritical`)
- canais (app_impetus, notification_center se crítico, dashboard se persist)
- escalationLevel
- destinatários
- policyId (`TPM_CRITICAL` para incidentes críticos)

Métricas: `event_governance_tpm_*`.

---

## Audit endpoint

```
GET /api/audit/event-governance/tpm
Auth: requireAuth + requireTenantAdminRole
```

---

## Testes

```bash
cd backend && node src/tests/audit/EVENT_GOVERNANCE_06_TPM.test.js
```

**Resultado: 15 passed, 0 failed**

---

## Produtores migrados (acumulado)

| Fase | Produtor |
|------|----------|
| EG-04 | Operational Alerts |
| EG-05 | IA Proactiva |
| **EG-06** | **TPM** |

---

## Próximas fases

| Fase | Produtor |
|------|----------|
| EG-07 | Executive Mode |
| EG-08 | Billing |
| EG-09 | DSR |
| EG-10 | ManuIA |

---

## Referências

- Adapter: `backend/src/services/governanceAdapters/tpmGovernanceAdapter.js`
- Produtor: `backend/src/services/tpmNotifications.js`
