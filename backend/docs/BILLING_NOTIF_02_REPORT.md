# BILLING-NOTIF-02 — Relatório de Implementação

**Data:** 2026-06-20  
**Origem:** AUD-BILLING-NOTIF-01 · FIX-SUBSCRIPTION-UX-01 · AUD-NOTIFICATION-CENTER-02-FIX · NC-03-BRIDGE  
**Modo:** implementação aditiva — backward compatible  
**Escopo:** notificações progressivas dias 3/5/7 via arquitectura moderna

---

## Resumo executivo

Implementado o serviço `subscriptionBillingNotificationService` com escalonamento **dia 3 (email)**, **dia 5 (App Impetus)** e **dia 7 (Notification Center)**, integrado no ciclo existente do `subscriptionGovernanceScheduler` **antes** da suspensão. Dedupe em `subscription_notifications` com tipos `email_day3`, `app_day5`, `nc_day7` (substituindo `dashboard_day7` legado).

| Critério | Estado |
|----------|--------|
| Dia 3 email | **Implementado** |
| Dia 5 App Impetus | **Implementado** |
| Dia 7 NC | **Implementado** |
| Dedupe activo | **Sim** |
| Scheduler integrado | **Sim** |
| Flag `ENABLE_BILLING_NOTIFICATIONS` | **Sim** (default **false**) |
| Z-API / worker PM2 / tabela nova | **Não** |
| Testes | **15/15** |

```json
{
  "billing_notif_02_complete": true,
  "day3_email_enabled": true,
  "day5_app_impetus_enabled": true,
  "day7_notification_center_enabled": true,
  "dedupe_active": true,
  "scheduler_integrated": true,
  "feature_flag_present": true,
  "tests_passing": true,
  "safe_for_production": true,
  "zapi_restored": false,
  "workers_created": false
}
```

---

## Arquitectura

```text
ENABLE_SUBSCRIPTION_GOVERNANCE_CRON=true
  → cron 0 * * * *
      → runSubscriptionGovernanceCycle()
          → processBillingNotifications()     [ENABLE_BILLING_NOTIFICATIONS]
              → overdue subs → dia 3/5/7
              → dedupe subscription_notifications
          → checkGracePeriodAndSuspend()      [inalterado]
```

**Independência de flags:**

| Flag | Efeito |
|------|--------|
| `ENABLE_SUBSCRIPTION_GOVERNANCE_CRON=false` | Ciclo não agenda (default) |
| `ENABLE_BILLING_NOTIFICATIONS=false` | Billing skipped no ciclo (default) |
| Ambas `true` | Billing + suspensão no mesmo ciclo horário |

---

## Artefactos criados

| Ficheiro | Função |
|----------|--------|
| `backend/src/services/subscription/subscriptionBillingNotificationService.js` | `processBillingNotifications()`, dedupe, canais 3/5/7, audit |
| `backend/src/tests/audit/BILLING_NOTIF_02.test.js` | 15 testes |

## Artefactos alterados

| Ficheiro | Alteração |
|----------|-----------|
| `subscriptionGovernanceScheduler.js` | Billing antes de suspensão; métricas em `lastMetrics` |
| `routes/audit.js` | `GET /api/audit/billing-notifications/status` |
| `observabilityService.js` | 6 métricas billing |
| `featureGovernanceService.js` | Registo `ENABLE_BILLING_NOTIFICATIONS` |

## Não alterados

- `asaasService.js`, webhooks Asaas  
- `notificationCenterService.js`, NC-03 bridges  
- `Layout.jsx`  
- Novas tabelas, workers PM2, cron separado  

---

## Canais por dia

### Dia 3 — Email

- **Canal:** `emailService.sendOverdueNotificationEmail`
- **Destinatário:** `subscriptionRecipientResolver.resolveForCompany(companyId).email`
- **Dedupe:** `email_day3`
- **Métricas:** `billing_notification_email_day3_attempt` / `_success`

### Dia 5 — App Impetus

- **Canal:** `appImpetusService.sendMessage(..., { originatedFrom: 'subscription' })`
- **Destinatário:** `recipient.phone` via resolver
- **Mensagem:** texto de inadimplência + link `/subscription-expired` + boleto (se `getSubscriptionPaymentLink` disponível)
- **Dedupe:** `app_day5`
- **Métricas:** `billing_notification_app_day5_attempt` / `_success`
- **Sem** Z-API / WhatsApp externo

### Dia 7 — Notification Center

- **Canal:** `unifiedMessagingService.sendToUser()`
- **Destinatários:** `hierarchy_level <= 1` ou `tenant_admins` activos; fallback `notificationBridgeService.findSupervisorNcRecipients()`
- **Mensagem:** aviso 7+ dias + risco de suspensão automática
- **Dedupe:** `nc_day7` (substitui `dashboard_day7` — NC é canal web oficial)
- **Métricas:** `billing_notification_nc_day7_attempt` / `_success`
- Banner overdue em `Layout.jsx` permanece UX reactiva (FIX-SUBSCRIPTION-UX-01)

---

## Dedupe

```sql
-- Antes de enviar
SELECT 1 FROM subscription_notifications
WHERE subscription_id = $1 AND notification_type = $2

-- Após sucesso
INSERT INTO subscription_notifications (..., notification_type, metadata, sent_at)
```

Tipos: `email_day3` | `app_day5` | `nc_day7`

---

## Feature flag

```env
ENABLE_BILLING_NOTIFICATIONS=false   # default — billing não executa
ENABLE_BILLING_NOTIFICATIONS=true    # activa dias 3/5/7 no ciclo de governança
```

Recomendação produção: activar primeiro em staging com `ENABLE_SUBSCRIPTION_GOVERNANCE_CRON=true` + SMTP configurado.

---

## Auditoria

**Endpoint:** `GET /api/audit/billing-notifications/status`  
**Auth:** `requireAuth` + `requireTenantAdminRole`  
**Scope:** tenant do utilizador autenticado

```json
{
  "ok": true,
  "enabled": false,
  "flag_active": false,
  "subscriptions_overdue": 0,
  "email_day3_sent": 0,
  "app_day5_sent": 0,
  "nc_day7_sent": 0,
  "dedupe_records": 0
}
```

---

## Testes

```bash
node backend/src/tests/audit/BILLING_NOTIF_02.test.js
```

**Resultado:** `{ "passed": 15, "failed": 0 }`

Cobertura: serviço, dedupe, canais 3/5/7, scheduler, flags, observabilidade, audit endpoint.

---

## Activação recomendada (DevOps)

1. `ENABLE_SUBSCRIPTION_GOVERNANCE_CRON=true` — agenda ciclo horário  
2. `ENABLE_BILLING_NOTIFICATIONS=true` — activa notificações  
3. Confirmar `SMTP_HOST` / `SMTP_USER` para dia 3  
4. Monitorizar `GET /api/audit/billing-notifications/status` e logs `[SUBSCRIPTION_GOVERNANCE]`

---

## Documentos relacionados

- [AUD_BILLING_NOTIF_01_REPORT.md](./AUD_BILLING_NOTIF_01_REPORT.md)
- [FIX_SUBSCRIPTION_UX_01_REPORT.md](./FIX_SUBSCRIPTION_UX_01_REPORT.md)
- [AUD_WORKERS_01_FIX_SUBSCRIPTION_REPORT.md](./AUD_WORKERS_01_FIX_SUBSCRIPTION_REPORT.md)
- [AUD_NOTIFICATION_CENTER_02_FIX_REPORT.md](./AUD_NOTIFICATION_CENTER_02_FIX_REPORT.md)
