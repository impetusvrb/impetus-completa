# EVENT-GOVERNANCE-08 — Relatório de Implementação (Billing)

**Data:** 2026-06-20  
**Origem:** EVENT-GOVERNANCE-01/02/03 · EG-04–07  
**Modo:** migração conservadora — shadow default  
**Escopo:** distribuição de notificações Billing → Event Governance (sem alterar lógica financeira)

---

## Resumo executivo

Migrada **apenas a orquestração de distribuição** de `subscriptionBillingNotificationService.js` para Event Governance. Dedupe (`subscription_notifications`), scheduler, Asaas, webhooks, suspensão e regras de cobrança permanecem inalterados.

| Critério | Estado |
|----------|--------|
| `billingGovernanceAdapter` | **Implementado** |
| Integração day3 / day5 / day7 | **Implementado** |
| Shadow comparison | **Implementado** |
| Fallback legado | **Implementado** |
| Dedupe preservado | **Sim** |
| Flag `EVENT_GOVERNANCE_BILLING=false` | **Default** |
| Testes EG-08 | **15/15** |
| Testes BILLING-NOTIF-02 | **15/15** (actualizados p/ adapter) |

```json
{
  "billing_migrated": true,
  "financial_logic_preserved": true,
  "dedupe_preserved": true,
  "shadow_mode_available": true,
  "fallback_available": true,
  "tests_passing": true
}
```

---

## Arquitectura

### Antes

```text
subscriptionBillingNotificationService
         ↓
Email / App Impetus / Notification Center
```

### Depois (default — shadow OFF)

```text
subscriptionBillingNotificationService
    ↓ wasNotificationSent / recordNotificationSent (dedupe)
    ↓ _dispatchBillingSend()
    ↓ billingGovernanceAdapter.dispatchBillingNotification() → shadow compare
    ↓ runLegacyDistribution() → Email / App / NC
```

### Migrado (flag ON + execução)

```text
subscriptionBillingNotificationService
    ↓ dedupe (inalterado)
    ↓ billingGovernanceAdapter
    ↓ evaluatePrepareAndExecute()
    ↓ Policy (BILLING_EMAIL_DAY3 | BILLING_APP_DAY5 | BILLING_NC_DAY7)
    ↓ executePlan() → emailExecutor | appImpetusExecutor | notificationCenterExecutor
```

---

## Mapeamento de fases

| Fase Billing | Policy ID | Canal | eventType |
|--------------|-----------|-------|-----------|
| `DAY_3_EMAIL` | `BILLING_EMAIL_DAY3` | email | `subscription_notification_day3` |
| `DAY_5_APP` | `BILLING_APP_DAY5` | app_impetus | `subscription_notification_day5` |
| `DAY_7_NC` | `BILLING_NC_DAY7` | notification_center | `subscription_notification_day7` |

---

## Flag

| Variável | Default | Comportamento |
|----------|---------|---------------|
| `EVENT_GOVERNANCE_BILLING=false` | **Sim** | Shadow + fluxo legado |
| `EVENT_GOVERNANCE_BILLING=true` | — | Governance controla distribuição |

Execução real via executores: `EVENT_GOVERNANCE_EXECUTION_ENABLED=true`.

---

## O que NÃO foi alterado

- `asaasService.js`
- `webhooks/asaas.js`
- `subscriptionGovernanceScheduler.js`
- Tabela `subscription_notifications` (fonte da verdade dedupe)
- `subscriptionRecipientResolver`
- Suspensão / grace period / cobrança

---

## Shadow comparison

Compara legado vs governance:

- `policyId`
- canal (email / app_impetus / notification_center)
- destinatários (email, phone, userIds)
- `escalationLevel`

Métricas:

- `event_governance_billing_events`
- `event_governance_billing_migrated`
- `event_governance_billing_shadow_total`
- `event_governance_billing_shadow_match`
- `event_governance_billing_shadow_divergence`

---

## Fallback

```text
Governance falhou → runLegacyDistribution() (adapter)
                  → _dispatchBillingSend catch → runLegacyDistribution()
```

Sem perda de notificação quando governance indisponível.

---

## Audit endpoint

```
GET /api/audit/event-governance/billing
Auth: requireAuth + requireTenantAdminRole
```

Resposta:

```json
{
  "ok": true,
  "enabled": false,
  "shadow_mode": true,
  "events_evaluated": 0,
  "matches": 0,
  "divergences": 0,
  "migrated_events": 0,
  "shadow_total": 0
}
```

---

## Testes

```bash
cd backend && node src/tests/audit/EVENT_GOVERNANCE_08_BILLING.test.js
cd backend && node src/tests/audit/BILLING_NOTIF_02.test.js
```

**Resultado EG-08: 15 passed, 0 failed**

---

## Produtores migrados (acumulado)

| Fase | Produtor |
|------|----------|
| EG-04 | Operational Alerts |
| EG-05 | IA Proactiva |
| EG-06 | TPM |
| EG-07 | Executive Mode |
| **EG-08** | **Billing (distribuição)** |

---

## Próximas fases

| Fase | Produtor |
|------|----------|
| EG-09 | DSR |
| EG-10 | ManuIA |
| EG-11 | Quality / SST / ESG |
| EG-12 | AIOI |

---

## Referências

- Adapter: `backend/src/services/governanceAdapters/billingGovernanceAdapter.js`
- Produtor: `backend/src/services/subscription/subscriptionBillingNotificationService.js`
- Audit: `backend/src/routes/audit.js` → `/event-governance/billing`
