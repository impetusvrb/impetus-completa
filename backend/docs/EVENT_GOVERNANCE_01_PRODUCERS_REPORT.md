# EVENT-GOVERNANCE-01 — Relatório de Produtores de Eventos

**Data:** 2026-06-20  
**Modo:** auditoria read-only — inventário para governança centralizada  
**Próxima fase:** EVENT-GOVERNANCE-02 (execução de decisões)

---

## Resumo

O IMPETUS possui **dezenas de produtores** que decidem autonomamente canal, severidade e destinatários. Este relatório mapeia os produtores prioritários para integração futura com `eventGovernanceService.evaluateEvent()` em shadow mode.

**Nenhum produtor foi alterado nesta fase.**

---

## Inventário por domínio

### Operacional

```json
{
  "producer": "operationalAlertsService",
  "event_type": "operational_alert / tipo_alerta variável",
  "severity": "severidade (baixa|media|alta|high|critical)",
  "current_channel": "operational_alerts (BD) + notificationBridge → NC (alta/high/critical)",
  "recipient_strategy": "company-scoped; bridge usa findSupervisorNcRecipients",
  "candidate_for_governance": true
}
```

```json
{
  "producer": "operationalRealtimeCoordinator",
  "event_type": "machine_stop | part_failure | informational | operational_event",
  "severity": "inferida (high|medium|low) ou routing Gemini",
  "current_channel": "unifiedMessaging.sendToUser (NC) + tasks opcionais",
  "recipient_strategy": "findUsersByRoles(notify_roles) + filterUsersByAccess",
  "candidate_for_governance": true
}
```

```json
{
  "producer": "operationalActionExecutor",
  "event_type": "operational_decision | autonomous_execution",
  "severity": "high (alerts) | low|medium (soft alerts)",
  "current_channel": "unifiedMessaging.sendToUser",
  "recipient_strategy": "user.id do contexto de decisão",
  "candidate_for_governance": true
}
```

### TPM

```json
{
  "producer": "tpmNotifications",
  "event_type": "tpm_incident",
  "severity": "critical/high por perdas ou severity do incidente",
  "current_channel": "appImpetusService + notificationBridge.bridgeTpmIncident → NC",
  "recipient_strategy": "getNotifyRecipients (users, whatsapp_contacts, company.config)",
  "candidate_for_governance": true
}
```

### IA

```json
{
  "producer": "aiProactiveMessagingService",
  "event_type": "proactive / triggerType genérico",
  "severity": "medium (implícito)",
  "current_channel": "appImpetusService + notificationBridge.bridgeProactiveMessage",
  "recipient_strategy": "recipientPhone / recipientUserId + consent LGPD",
  "candidate_for_governance": true
}
```

```json
{
  "producer": "proactiveAI (jobs/proactiveAI.js)",
  "event_type": "failure_pattern",
  "severity": "medium-high (implícito)",
  "current_channel": "appImpetusService + NC bridge + ai_proactive_alerts (BD)",
  "recipient_strategy": "hierarchy_level <= 4, phones únicos (max 5)",
  "candidate_for_governance": true
}
```

```json
{
  "producer": "executiveMode",
  "event_type": "executive_response / CEO mode",
  "severity": "high (implícito)",
  "current_channel": "appImpetusService + notificationBridge.bridgeExecutiveMessage",
  "recipient_strategy": "telefone destinatário + roles executivos",
  "candidate_for_governance": true
}
```

```json
{
  "producer": "organizationalAI",
  "event_type": "org_ai / failure pattern messages",
  "severity": "variável",
  "current_channel": "appImpetusService (originatedFrom: org_ai)",
  "recipient_strategy": "phone por destinatário",
  "candidate_for_governance": true
}
```

### Billing

```json
{
  "producer": "subscriptionBillingNotificationService",
  "event_type": "subscription_notification_day3 | day5 | day7",
  "severity": "warning (implícito por dia de carência)",
  "current_channel": "dia3: email | dia5: app_impetus | dia7: unifiedMessaging (NC)",
  "recipient_strategy": "subscriptionRecipientResolver + hierarchy_lte_1 / tenant_admin",
  "candidate_for_governance": true
}
```

### DSR / LGPD

```json
{
  "producer": "dsrNotificationService",
  "event_type": "dsr_export_* | dsr_erase_* | dsr_sla_approaching",
  "severity": "priority map (medium|high|critical)",
  "current_channel": "notifications table (NC-adjacent) + notifyDpoTeam",
  "recipient_strategy": "userId titular; DPO: hierarchy_level <= 1",
  "candidate_for_governance": true
}
```

### ManuIA

```json
{
  "producer": "manuiaInboxIngestService",
  "event_type": "eventType genérico (OS, alerta, etc.)",
  "severity": "severity + alertLevel via manuiaAlertDecisionService",
  "current_channel": "manuia_inbox_notifications + web push opcional",
  "recipient_strategy": "userId técnico + prefs/on_call",
  "candidate_for_governance": true
}
```

### Notification Center (infraestrutura)

```json
{
  "producer": "notificationBridgeService",
  "event_type": "bridge_operational | bridge_tpm | bridge_proactive | bridge_executive",
  "severity": "filtrada por isOperationalSeverityEligible / isTpmIncidentCritical",
  "current_channel": "unifiedMessaging.sendToUser → app_notifications",
  "recipient_strategy": "findSupervisorNcRecipients | findUserByPhone | event userId",
  "candidate_for_governance": true
}
```

```json
{
  "producer": "unifiedMessagingService",
  "event_type": "app_notification (genérico)",
  "severity": "não normalizada (opts.type)",
  "current_channel": "app_notifications + socket app_notification",
  "recipient_strategy": "recipientUserId explícito",
  "candidate_for_governance": true
}
```

### Produtores adicionais identificados

```json
{
  "producer": "appCommunicationService",
  "event_type": "app_message_reply",
  "severity": "info",
  "current_channel": "unifiedMessaging.sendToUser",
  "recipient_strategy": "senderId / recipient explícito",
  "candidate_for_governance": true
}
```

```json
{
  "producer": "reminderSchedulerService",
  "event_type": "task_reminder",
  "severity": "low",
  "current_channel": "unifiedMessaging.sendToUser",
  "recipient_strategy": "user_id da tarefa",
  "candidate_for_governance": true
}
```

```json
{
  "producer": "notificationFederationService",
  "event_type": "N/A (read-only aggregator)",
  "severity": "N/A",
  "current_channel": "GET unified-notifications (leitura)",
  "recipient_strategy": "N/A",
  "candidate_for_governance": false
}
```

---

## Matriz canal × produtor

| Canal actual | Produtores principais |
|--------------|----------------------|
| `notification_center` | bridge, unifiedMessaging, billing day7, actionExecutor, realtime |
| `app_impetus` | tpm, proactive, executive, billing day5, org_ai |
| `email` | billing day3, emailService (password reset separado) |
| `operational_alerts` | operationalAlertsService |
| `notifications` (DSR) | dsrNotificationService |
| `manuia_inbox` | manuiaInboxIngestService |
| `dashboard` | liveDashboard, cognitivePulse (leitura alertas) |

---

## Duplicação identificada

| Padrão | Exemplo |
|--------|---------|
| Dual write App + NC | TPM, proactive, executive, operational alta |
| Severidade não normalizada | `alta` vs `high` vs `critical` vs `media` |
| Recipient ad-hoc | hierarchy_level thresholds diferentes (1, 2, 4) por módulo |
| Escalonamento implícito | billing 3/5/7 dias vs operational imediato |

---

## Políticas mapeadas (eventPolicyCatalog)

| Policy ID | Categoria | Canais decisão |
|-----------|-----------|----------------|
| `OPERATIONAL_CRITICAL` | operational | NC, dashboard, operational_alerts |
| `OPERATIONAL_MEDIUM` | operational | dashboard, operational_alerts |
| `TPM_CRITICAL` | tpm | app_impetus, NC |
| `AI_PROACTIVE` | ai | app_impetus, NC |
| `EXECUTIVE_ALERT` | executive | app_impetus, NC |
| `BILLING_EMAIL_DAY3` | billing | email |
| `BILLING_APP_DAY5` | billing | app_impetus |
| `BILLING_NC_DAY7` | billing | NC |
| `DSR_LIFECYCLE` | dsr | NC, notifications_table |
| `MANUIA_INBOX` | manuia | manuia_inbox |
| `CHAT_OPERATIONAL` | operational | NC, chat |
| `DEFAULT_INFO` | * | dashboard |

---

## Recomendação EVENT-GOVERNANCE-02

1. Instrumentar produtores com `evaluateEvent()` **antes** do envio (shadow → execução).  
2. Substituir dual-write ad-hoc por decisão única de canais.  
3. Centralizar `normalizeSeverity()` em todos os ingressos.  
4. Manter NC-03 bridges até migração gradual — governança decide, executor despacha.

---

## Documentos relacionados

- [NC_04_FEDERATION_REPORT.md](./NC_04_FEDERATION_REPORT.md)
- [BILLING_NOTIF_02_REPORT.md](./BILLING_NOTIF_02_REPORT.md)
- [NC_03_BRIDGE_REPORT.md](./NC_03_BRIDGE_REPORT.md)
