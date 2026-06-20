# NC-03-BRIDGE — Consolidação dos Produtores no Notification Center

**Data:** 2026-06-19  
**Origem:** [AUD_NOTIFICATION_CENTER_01_REPORT.md](./AUD_NOTIFICATION_CENTER_01_REPORT.md) · [AUD_NOTIFICATION_CENTER_02_FIX_REPORT.md](./AUD_NOTIFICATION_CENTER_02_FIX_REPORT.md)  
**Modo:** aditivo — reutiliza `unifiedMessagingService` → `app_notifications` → Notification Center  
**Escopo:** bridges de produtores — **sem** billing, Pró-Ação, workers, Z-API ou novas tabelas

---

## Resumo executivo

Quatro produtores legados passaram a **espelhar** mensagens no Notification Center web, mantendo canais mobile (`app_impetus_outbox`) e tabelas existentes (`operational_alerts`, `alerts`).

| Produtor | Antes | Depois |
|----------|-------|--------|
| Operational Alerts | `operational_alerts` only | + NC para severidade **alta/high/critical** |
| TPM | `alerts` + App Impetus | + NC para incidentes **críticos** |
| IA Proactiva | App Impetus outbox | + NC (dual delivery) |
| Executive Mode | App Impetus outbox | + NC para roles CEO / Diretor / Gerente Industrial |

**Testes:** 12/12 passed

---

## ETAPA 1 — Inventário dos produtores (pós-bridge)

```json
{
  "operationalAlertsService": {
    "already_uses_unifiedMessaging": false,
    "import_was_unused": true,
    "currently_uses_operational_alerts": true,
    "eligible_for_bridge": true,
    "bridged": true
  },
  "tpmNotifications": {
    "already_uses_unifiedMessaging": false,
    "currently_uses_app_outbox": true,
    "currently_uses_alerts_table": true,
    "eligible_for_bridge": true,
    "bridged": true
  },
  "aiProactiveMessagingService": {
    "already_uses_unifiedMessaging": false,
    "currently_uses_app_outbox": true,
    "eligible_for_bridge": true,
    "bridged": true
  },
  "proactiveAI.js": {
    "already_uses_unifiedMessaging": false,
    "currently_uses_app_outbox": true,
    "eligible_for_bridge": true,
    "bridged": true
  },
  "executiveMode.js": {
    "already_uses_unifiedMessaging": false,
    "currently_uses_app_outbox": true,
    "eligible_for_bridge": true,
    "bridged": true
  },
  "appImpetusService": {
    "role": "Canal mobile canónico — inalterado",
    "bridged_at_source": false,
    "note": "Bridges nos callers; outbox preservado"
  }
}
```

---

## ETAPA 2 — Operational Alerts

### Confirmação NC-01

`operationalAlertsService.js` importava `unifiedMessagingService` **sem invocar** — confirmado e corrigido via `notificationBridgeService`.

### Bridge implementada

- **Gatilho:** após `INSERT INTO operational_alerts` bem-sucedido
- **Severidade elegível:** `alta`, `high`, `critical`, `critica`
- **Não elegível:** `media`, `baixa` (ex.: tarefas atrasadas)
- **Destinatários NC:** supervisores/admins (`hierarchy_level <= 2` ou roles admin/manager/gerente/supervisor/ceo/diretor), max 5
- **Persistência:** `operational_alerts` **inalterada**

Pontos de integração:

- `checkAndCreate` — máquina parada (`alta`)
- `persistDecisionEngineAlerts` — motor de decisões (high → alta)
- `createPlanningDerivedAlert` — se severidade elegível

---

## ETAPA 3 — TPM

### Fluxo dual delivery

```text
notifyTpmIncident()
  → appImpetusService.sendMessage()     [mobile — mantido]
  → notificationBridge.bridgeTpmIncident() [NC — novo]
  → maybePersistAlertRow()               [alerts — mantido]
```

### Critério crítico (`isTpmIncidentCritical`)

- `severity` / `priority` ∈ {critical, high, alta, critica}
- **OU** soma de perdas ≥ `TPM_NC_CRITICAL_LOSSES_MIN` (default **10**)

### Destinatários NC

1. Recipients com `id` UUID (users)
2. Fallback: supervisores (max 3) se nenhum user id nos recipients

---

## ETAPA 4 — IA Proactiva

### `aiProactiveMessagingService.sendProactiveMessage`

Após sucesso em `appImpetusService.sendMessage`:

```javascript
notificationBridge.bridgeProactiveMessage(companyId, recipientUserId, recipientPhone, message)
```

### `jobs/proactiveAI.js`

- `runFailurePatternCheck` — resolve `user.id` por phone; bridge após outbox
- `remindIncompleteEvents` — bridge por `sender_phone`

Mobile **preservado** em ambos os fluxos.

---

## ETAPA 5 — Executive Mode

### `sendCEOResponse`

Dual delivery:

1. `appImpetusService.sendMessage` (`originatedFrom: 'executive'`)
2. `bridgeExecutiveMessage` — resolve user por phone; valida role

### Roles elegíveis (`isExecutiveRoleEligible`)

- `ceo`
- Diretor Industrial (`diretor` + job_title industrial, ou pattern no job_title)
- Gerente Industrial (`gerente` + industrial no job_title)

---

## ETAPA 6 — Observabilidade

Métricas via `observabilityService.incrementMetric()`:

| Métrica | Bridge |
|---------|--------|
| `notification_bridge_operational_alerts` | Operational alerts |
| `notification_bridge_tpm` | TPM |
| `notification_bridge_ai_proactive` | IA proactiva |
| `notification_bridge_executive` | Executive mode |

Flag global: `NC_03_BRIDGE_ENABLED` (default **true**). `false` desactiva bridges sem afectar mobile/alerts.

---

## ETAPA 7 — Auditoria

### `GET /api/audit/notification-center/bridges`

Auth: `requireAuth` + `requireTenantAdminRole`

Resposta exemplo:

```json
{
  "ok": true,
  "operational_alerts": true,
  "tpm": true,
  "ai_proactive": true,
  "executive_mode": true,
  "bridge_enabled": true,
  "metrics": {
    "notification_bridge_operational_alerts": 42,
    "notification_bridge_tpm": 7,
    "notification_bridge_ai_proactive": 15,
    "notification_bridge_executive": 3
  }
}
```

---

## Artefactos criados / modificados

| Ficheiro | Acção |
|----------|-------|
| `backend/src/services/notificationBridgeService.js` | **Novo** — lógica central de bridges |
| `backend/src/services/operationalAlertsService.js` | Bridge pós-insert |
| `backend/src/services/tpmNotifications.js` | Dual delivery |
| `backend/src/services/aiProactiveMessagingService.js` | Espelho NC |
| `backend/src/jobs/proactiveAI.js` | Espelho NC |
| `backend/src/services/executiveMode.js` | Dual delivery CEO |
| `backend/src/routes/audit.js` | Endpoint `/bridges` |
| `backend/src/tests/audit/NC_03_BRIDGE.test.js` | 12 testes |

**Não alterado:** `app_impetus_outbox`, schema `alerts`, schema `operational_alerts`, RBAC, MFA, RLS.

---

## Testes executados

```bash
node backend/src/tests/audit/NC_03_BRIDGE.test.js
# 12 passed, 0 failed
```

Cobertura:

- Severidade operacional elegível / não elegível
- TPM crítico por severity e perdas
- Código-fonte mantém App Impetus + alerts + operational_alerts
- Bridges wired em todos os produtores
- Endpoint audit bridges
- Registry activo

---

## Critério de sucesso

```json
{
  "nc_03_bridge_complete": true,
  "operational_alerts_connected": true,
  "tpm_connected": true,
  "ai_proactive_connected": true,
  "executive_mode_connected": true,
  "mobile_channel_preserved": true,
  "notification_center_receiving_events": true,
  "tests_passing": true,
  "safe_for_production": true
}
```

---

## Riscos residuais

| Risco | Mitigação |
|-------|-----------|
| Spam NC em rajada de alertas operacionais | Só severidade alta+; max 5 destinatários; dedupe operacional existente |
| TPM contactos sem `user.id` | Fallback supervisores; mobile continua via phone |
| IA proactiva job sem user id resolvível | NC skip; mobile mantido |
| Executive bridge só em `sendCEOResponse` | Respostas auto-reply app passam por fluxo executive existente |
| `NC_03_BRIDGE_ENABLED=false` | Kill switch sem deploy |

---

## Próximos candidatos à integração (fora de escopo)

| Módulo | Estado | Fase sugerida |
|--------|--------|---------------|
| Billing / Subscription | Não bridged | AUD-BILLING-NOTIF |
| Pró-Ação worker / SLA | Não bridged | NC-04-proacao |
| DSR `notifications` table | Sistema paralelo | NC-05-federation |
| ManuIA inbox | Completo no módulo | Resumo no NC web |
| Quality / Safety / ESG domains | Event backbone only | NC-06-domain-events |
| AIOI HITL decisions | Futuro | AIOI-NC-bridge |

---

## Diagrama pós-bridge

```text
                    ┌─────────────────────────┐
                    │ notificationBridgeService│
                    └────────────┬────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         ▼                       ▼                       ▼
 operationalAlerts         tpmNotifications      aiProactive + job
 (alta/high/critical)      (critical only)       (dual)
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 ▼
                    unifiedMessaging.sendToUser()
                                 ▼
                         app_notifications
                                 ▼
                    Notification Center (web)

Paralelo inalterado:
  appImpetusService → app_impetus_outbox → App Mobile
  operational_alerts / alerts → painéis legados
```

---

*Implementação aditiva. App Impetus permanece canal mobile oficial; Notification Center canal web oficial.*
