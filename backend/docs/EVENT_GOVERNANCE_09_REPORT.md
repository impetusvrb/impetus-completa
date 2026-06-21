# EVENT-GOVERNANCE-09 — Relatório de Implementação (DSR/LGPD)

**Data:** 2026-06-20  
**Origem:** EVENT-GOVERNANCE-01/02/03 · EG-04–08  
**Modo:** migração conservadora — shadow default  
**Escopo:** distribuição de notificações DSR → Event Governance (sem alterar workflow legal)

---

## Resumo executivo

Migrada **apenas a orquestração de distribuição** de `dsrNotificationService.js` para Event Governance. Workflow LGPD, SLA, estados, retenção, tabela `notifications` e federação NC-04 permanecem inalterados.

| Critério | Estado |
|----------|--------|
| `dsrGovernanceAdapter` | **Implementado** |
| Integração `notify()` | **Implementado** |
| Shadow comparison | **Implementado** |
| Fallback legado | **Implementado** |
| Federação NC-04 | **Preservada** |
| Flag `EVENT_GOVERNANCE_DSR=false` | **Default** |
| Testes | **15/15** |

```json
{
  "dsr_migrated": true,
  "legal_workflow_preserved": true,
  "federation_preserved": true,
  "shadow_mode_available": true,
  "fallback_available": true,
  "tests_passing": true
}
```

---

## Arquitectura

### Antes

```text
dsrNotificationService.notify()
         ↓
INSERT notifications
         ↓
NC-04 Federation (read)
```

### Depois (default — shadow OFF)

```text
notify() → _dispatchDsrNotify()
    ↓ dsrGovernanceAdapter.dispatchDsrNotification() → shadow compare
    ↓ runLegacyDistribution() → INSERT notifications
```

### Migrado (flag ON)

```text
notify() → Governance evaluatePrepareAndExecute()
    ↓ DSR_LIFECYCLE policy
    ↓ runLegacyDistribution() → INSERT notifications (federação intacta)
```

---

## Mapeamento lifecycle

| Fase | Tipos DSR |
|------|-----------|
| `REQUEST_CREATED` | export/erase submitted |
| `REQUEST_ASSIGNED` | export/erase approved |
| `REQUEST_DUE_SOON` | sla_approaching |
| `REQUEST_COMPLETED` | export/erase executed |
| `REQUEST_REJECTED` | export/erase rejected |

Política: **`DSR_LIFECYCLE`**

---

## Flag

| Variável | Default | Comportamento |
|----------|---------|---------------|
| `EVENT_GOVERNANCE_DSR=false` | **Sim** | Shadow + fluxo legado |
| `EVENT_GOVERNANCE_DSR=true` | — | Governance controla distribuição |

---

## O que NÃO foi alterado

- `routes/lgpd.js` — workflow e estados
- `scanSlaApproaching()` / `startSlaScheduler()` — lógica SLA
- Schema `notifications`
- `notificationFederationService` (NC-04)
- `dsrExportService` / `dsrEraseService`

---

## Federação NC-04

A execução governance persiste na tabela `notifications` via `runLegacyDistribution()`, garantindo que `notificationFederationService` continua a agregar DSR sem alterações.

---

## Audit endpoint

```
GET /api/audit/event-governance/dsr
Auth: requireAuth + requireTenantAdminRole
```

---

## Testes

```bash
cd backend && node src/tests/audit/EVENT_GOVERNANCE_09_DSR.test.js
```

**Resultado: 15 passed, 0 failed**

---

## Produtores migrados (acumulado)

| Fase | Produtor |
|------|----------|
| EG-04 | Operational Alerts |
| EG-05 | IA Proactiva |
| EG-06 | TPM |
| EG-07 | Executive Mode |
| EG-08 | Billing |
| **EG-09** | **DSR/LGPD** |

---

## Próximas fases

| Fase | Produtor |
|------|----------|
| EG-10 | ManuIA |
| EG-11 | Quality / SST / ESG |
| EG-12 | AIOI |

---

## Referências

- Auditoria: `backend/docs/EVENT_GOVERNANCE_09_DSR_AUDIT.md`
- Adapter: `backend/src/services/governanceAdapters/dsrGovernanceAdapter.js`
- Produtor: `backend/src/services/dsrNotificationService.js`
