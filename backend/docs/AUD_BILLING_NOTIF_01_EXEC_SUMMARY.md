# AUD-BILLING-NOTIF-01 — Resumo Executivo

**Data:** 2026-06-19  
**Modo:** auditoria read-only — zero alterações de código, BD ou runtime  
**Relatório completo:** [AUD_BILLING_NOTIF_01_REPORT.md](./AUD_BILLING_NOTIF_01_REPORT.md)

---

## Veredicto

O fluxo financeiro Asaas **funciona para estado e bloqueio** (webhooks → BD, suspensão pós-carência, link de pagamento, UX reactiva parcial). A **camada proactiva de comunicação de cobrança (dias 3/5/7) está ausente** desde a remoção de `subscriptionNotifications.js` e `subscription_worker.js` (Mar/2026). Billing está **silencioso** fora de sinais reactivos limitados.

```json
{
  "audit_completed": true,
  "billing_flow_mapped": true,
  "recipients_identified": true,
  "channels_audited": true,
  "legacy_flow_understood": true,
  "modern_architecture_assessed": true,
  "implementation_recommendation_generated": true,
  "code_changed": false
}
```

---

## Estado actual vs desejado

| Área | Hoje | Legado (pré-Mar/2026) |
|------|------|------------------------|
| Webhook `PAYMENT_OVERDUE` | BD + audit log | BD + audit log |
| Dia 3 — email | **Não envia** | `sendOverdueNotificationEmail` |
| Dia 5 — mobile | **Não envia** | `appImpetusService` (outbox) |
| Dia 7 — alerta | Banner genérico (se API existir) | Flag `overdue_alert_day7` + NC implícito |
| Dia 10 — suspensão | Scheduler (flag **off** por default) | Worker horário |
| Dedupe | Tabela vazia, sem writer | `subscription_notifications` |

---

## Respostas às 10 perguntas obrigatórias

| # | Pergunta | Resposta |
|---|----------|----------|
| 1 | Billing está completamente silencioso? | **Quase sim.** Proactivo: 100% silencioso. Reactivo: banner overdue (provavelmente quebrado — ver gap `/companies/me`), página `/subscription-expired`, mailto/wa.me estáticos, HTTP 403 em rotas protegidas. |
| 2 | Risco de churn por ausência de comunicação? | **Sim, elevado.** Sem avisos 3/5/7 o cliente só descobre bloqueio ou ao logar (se banner funcionar). |
| 3 | Quem deve receber? | **Financeiro:** `data_controller_email` \|\| `config.billing_email` (código); **fallback real nesta BD:** `email_responsavel`. **Mobile dia 5:** `data_controller_phone` / `telefone_responsavel`. **Dia 7 NC:** admins `hierarchy_level ≤ 1`, `is_tenant_admin`, roles admin/manager/ceo/diretor. |
| 4 | NC apto para Billing? | **Sim** (pós NC-02-FIX + NC-03-BRIDGE). Escrita via `unifiedMessagingService.sendToUser`; sem bridge billing hoje. |
| 5 | App Impetus deve participar? | **Sim, dia 5** — canal já usado no legado (`originatedFrom: 'subscription'`); sem Z-API. |
| 6 | Email deve participar? | **Sim, dia 3** — `sendOverdueNotificationEmail` existe, zero callers. |
| 7 | Reutilizar `subscription_notifications`? | **Sim** — schema confirmado na BD; 0 registos; TTL 180d em retention policy. |
| 8 | Necessidade de worker PM2? | **Não.** Estender `subscriptionGovernanceScheduler` (mesmo cron horário). |
| 9 | Necessidade de cron novo? | **Não.** Mesmo scheduler; flag `ENABLE_SUBSCRIPTION_GOVERNANCE_CRON` já existe. |
| 10 | Implementação correcta (fase seguinte)? | **BILLING-NOTIF-02:** serviço aditivo `subscriptionBillingNotificationService` invocado no ciclo de governança; dedupe em `subscription_notifications`; canais dia 3/5/7 conforme matriz abaixo; corrigir gaps UX (`/companies/me`, destinatários, `COMPANY_INACTIVE`). |

---

## Gaps críticos (fora do escopo desta auditoria — para BILLING-NOTIF-02)

1. **`GET /api/companies/me` inexistente** — `Layout.jsx` chama rota que não está em `routes/companies.js`; banner overdue provavelmente nunca activa.
2. **Deriva de schema** — código Asaas/billing referencia `data_controller_email`, `config`; BD auditada tem `email_responsavel`, `telefone_responsavel` (sem `config`).
3. **`COMPANY_INACTIVE` ausente no backend** — frontend redirecciona para `/subscription-expired` com code que `multiTenant.js` não emite.
4. **Constantes `SUBSCRIPTION.OVERDUE_WHATSAPP_DAY5` removidas** de `messages.js` — texto dia 5 terá de ser recriado na fase 2.
5. **Scheduler de suspensão desligado por default** — `ENABLE_SUBSCRIPTION_GOVERNANCE_CRON=false`.

---

## Recomendação estratégica (BILLING-NOTIF-02)

```json
{
  "recommended_next_phase": "BILLING-NOTIF-02",
  "recommended_channels": {
    "day_3": ["email"],
    "day_5": ["app_impetus"],
    "day_7": ["notification_center", "dashboard_banner"]
  },
  "dedupe_strategy": "INSERT em subscription_notifications por (subscription_id, notification_type) — tipos email_day3, whatsapp_day5, dashboard_day7; idempotência antes de cada envio",
  "risk_level": "medium",
  "safe_for_production": true
}
```

**Condições para produção segura:** feature flag dedicada; não alterar webhooks Asaas; resolver destinatários (mapeamento `email_responsavel` ↔ campos Asaas); activar governança cron em staging antes de prod; zero Z-API/WhatsApp directo.

---

## Critério de sucesso desta auditoria

```json
{
  "notification_center_operational": true,
  "notification_center_receiving_events": true,
  "subscription_governance_scheduler_active": false,
  "billing_notifications_exist": false,
  "audit_deliverables": ["AUD_BILLING_NOTIF_01_REPORT.md", "AUD_BILLING_NOTIF_01_EXEC_SUMMARY.md"]
}
```

*Nota: `subscription_governance_scheduler_active` depende da flag de ambiente; código existe, default desligado.*
