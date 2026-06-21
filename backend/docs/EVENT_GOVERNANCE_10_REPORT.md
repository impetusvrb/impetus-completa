# EVENT-GOVERNANCE-10 — Relatório de Implementação (ManuIA)

**Data:** 2026-06-20  
**Origem:** EVENT-GOVERNANCE-01/02/03 · EG-04–09  
**Modo:** migração conservadora — shadow default  
**Escopo:** distribuição ManuIA → Event Governance (sem alterar inteligência técnica)

---

## Resumo executivo

Migrada **apenas a orquestração de distribuição** via `manuiaInboxIngestService.ingestForUser()`. Diagnósticos, IA, OCR, embeddings, motor de manutenção e dispatch industrial permanecem inalterados.

| Critério | Estado |
|----------|--------|
| `manuiaGovernanceAdapter` | **Implementado** |
| Integração `ingestForUser()` | **Implementado** |
| Shadow comparison | **Implementado** |
| Fallback legado | **Implementado** |
| Federação NC-04 | **Preservada** |
| Flag `EVENT_GOVERNANCE_MANUIA=false` | **Default** |
| Testes | **15/15** |

```json
{
  "manuia_migrated": true,
  "technical_workflow_preserved": true,
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
manuiaEventDispatchService / manuiaApp routes
    ↓
ingestForUser()
    ↓
INSERT manuia_inbox_notifications + push opcional
```

### Depois (default — shadow OFF)

```text
ingestForUser() → _dispatchManuiaIngest()
    ↓ manuiaGovernanceAdapter.dispatchManuiaNotification() → shadow compare
    ↓ executeLegacyIngest() → inbox + push
```

### Migrado (flag ON)

```text
ingestForUser() → Governance evaluatePrepareAndExecute()
    ↓ MANUIA_INBOX policy
    ↓ executeLegacyIngest() → manuia_inbox_notifications (federação intacta)
```

---

## Mapeamento técnico

| Fase | Exemplos |
|------|----------|
| `DIAGNOSTIC_CREATED` / `COMPLETED` | diagnostic_* |
| `MANUAL_ANALYZED` | manual_ocr, manual_analyzed |
| `FAILURE_PREDICTED` | failure_predicted |
| `MAINTENANCE_RECOMMENDED` | maintenance_recommended |
| `CRITICAL_FAILURE` | plc_critical, machine_stopped |
| `ANOMALY_DETECTED` | ops_anomaly_* |
| `WORK_ORDER_CREATED` | work_order_created |
| `MANUAL_ESCALATION` | manual_escalation |

Política: **`MANUIA_INBOX`**

---

## Flag

| Variável | Default | Comportamento |
|----------|---------|---------------|
| `EVENT_GOVERNANCE_MANUIA=false` | **Sim** | Shadow + fluxo legado |
| `EVENT_GOVERNANCE_MANUIA=true` | — | Governance controla distribuição |

---

## O que NÃO foi alterado

- `manuiaEventDispatchService.js` — fan-out industrial
- `manuiaAlertDecisionService.js` — plantão/preferências
- `manuiaAiSummaryService.js`, OCR, embeddings, manuais
- `plcDataService`, `warehouseIntelligenceService`, etc. — triggers upstream
- Schema `manuia_inbox_notifications`
- `notificationFederationService` (NC-04)

---

## Audit endpoint

```
GET /api/audit/event-governance/manuia
Auth: requireAuth + requireTenantAdminRole
```

---

## Testes

```bash
cd backend && node src/tests/audit/EVENT_GOVERNANCE_10_MANUIA.test.js
```

---

## Produtores migrados (acumulado)

| Fase | Produtor |
|------|----------|
| EG-04 | Operational Alerts |
| EG-05 | IA Proactiva |
| EG-06 | TPM |
| EG-07 | Executive Mode |
| EG-08 | Billing |
| EG-09 | DSR/LGPD |
| **EG-10** | **ManuIA** |

---

## Próximas fases

| Fase | Produtor |
|------|----------|
| EG-11 | Quality / SST / ESG |
| EG-12 | AIOI |

---

## Referências

- Auditoria: `backend/docs/EVENT_GOVERNANCE_10_MANUIA_AUDIT.md`
- Adapter: `backend/src/services/governanceAdapters/manuiaGovernanceAdapter.js`
- Produtor: `backend/src/services/manuiaApp/manuiaInboxIngestService.js`
