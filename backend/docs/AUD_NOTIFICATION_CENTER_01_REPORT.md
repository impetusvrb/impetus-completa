# AUD-NOTIFICATION-CENTER-01 — Auditoria Completa do Notification Center

**Data:** 2026-06-19  
**Origem:** [AUD_WORKERS_01_REPORT.md](./AUD_WORKERS_01_REPORT.md) · [AUD_WORKERS_01_FIX_SUBSCRIPTION_REPORT.md](./AUD_WORKERS_01_FIX_SUBSCRIPTION_REPORT.md) · [AUD_WORKERS_01_PHASE2_NOTIFICATION_ARCHITECTURE.md](./AUD_WORKERS_01_PHASE2_NOTIFICATION_ARCHITECTURE.md)  
**Modo:** read-only — auditoria técnica, zero alterações de código  
**Repositório:** `/var/www/impetus-completa`

---

## Resumo executivo

O **Notification Center do IMPETUS existe como infraestrutura backend parcialmente funcional**, mas foi **abandonado a meio no frontend**. O backend grava notificações activamente em `app_notifications` via `unifiedMessagingService`; existe API de listagem; o Socket.IO emite `app_notification`. Porém:

- O sino no header (`Layout.jsx`) **nunca consome a API** — `notificationCount` fixo em `0` desde pelo menos **2026-03-10**.
- **Nenhum `socket.join('user_*')`** no backend nem listener `app_notification` no frontend.
- **Não existe** endpoint dedicado de “marcar como lida” para UX normal (só rollback operacional).
- **`messagingAdapter.js` existe mas não tem callers** no runtime — código morto.
- Módulos industriais (TPM, IA proactiva, ManuIA, DSR) usam **canais paralelos**, não o centro.

**Classificação:** **B) PARCIAL** com abandono explícito no frontend (**C**).  
**Conclusão estratégica:** concluir o Notification Center **antes** de implementar billing ou novos workers — desbloqueia dezenas de produtores com uma única camada de entrega.

---

## Modo de auditoria (confirmado)

```json
{
  "audit_mode": true,
  "read_only": true,
  "no_code_changes": true,
  "no_behavior_changes": true,
  "no_new_features": true,
  "no_mock_data": true,
  "no_notification_creation": true,
  "no_socket_changes": true,
  "no_frontend_changes": true
}
```

---

## ETAPA 1 — Inventário do Notification Center

### Artefactos auditados

| Artefacto | Caminho | Estado |
|-----------|---------|--------|
| Serviço canónico de escrita | `backend/src/services/unifiedMessagingService.js` | **Activo** |
| Facade documentada | `backend/src/services/messagingAdapter.js` | **Código morto** (0 imports em `backend/src`) |
| API listagem | `backend/src/routes/appCommunications.js:129` | **Activa** |
| UI sino / dropdown | `frontend/src/components/Layout.jsx:142-951` | **Shell estático** |
| Contexto toast | `frontend/src/context/NotificationContext.jsx` | **Toast UI** — não é Notification Center |
| Cliente API frontend | `frontend/src/services/api.js` | **Sem método** `GET /app-communications/notifications` |
| Socket backend | `backend/src/socket/chatSocket.js` | Chat only — **sem** room `user_{id}` |
| Boot Socket.IO | `backend/src/server.js:1601` | `unifiedMessaging.setSocketIo(io)` — **ligado** |

### Resultado estruturado

```json
{
  "notification_center_exists": true,
  "backend_api_exists": true,
  "frontend_component_exists": true,
  "notification_bell_exists": true,
  "note": "Existe como infraestrutura backend + UI placeholder. Não existe como produto integrado end-to-end."
}
```

### Evidência Git — UI nunca ligada

Commit `d2769829b` (2026-03-10, *"Atualização interface"*) já continha:

```javascript
const [notificationCount] = useState(0);
```

Sem fetch, sem setter, sem socket. A UI foi introduzida como **placeholder** e permaneceu inalterada em merges posteriores (Quality, Safety, Environment, Runtime Z, etc.).

Merge `53f1f8353` (2026-03-11) consolidou `messagingAdapter` / `unifiedMessaging` no backend durante resolução de conflitos Wellington — **backend avançou; frontend não acompanhou**.

---

## ETAPA 2 — Fluxo Completo de Notificações

### Diagrama canónico (estado actual)

```text
PRODUTOR                          SERVIÇO                         TABELA(S)                    API                    FRONTEND
─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
reminderScheduler          → unifiedMessaging.sendToUser    → app_notifications      → GET .../notifications   → ❌ (não consome)
operationalRealtimeCoord   → unifiedMessaging.sendToUser    → + communications       → (sem PATCH read)        → ❌
operationalActionExecutor  → unifiedMessaging.sendToUser    → sent_via_socket flag     →                         → ❌
appCommunicationService    → unifiedMessaging.sendToUser    →                          →                         → ❌
admin/incidents PATCH      → unifiedMessaging.sendToUser    →                          →                         → ❌
impetusAdmin/incidents     → unifiedMessaging.sendToUser    →                          →                         → ❌

TPM incidentes             → appImpetusService.sendMessage  → app_impetus_outbox       → GET /app-impetus/outbox → App Mobile
IA proactiva (job)         → appImpetusService.sendMessage  → (parallel channel)       →                         → ❌
executiveMode              → appImpetusService.sendMessage  →                          →                         → ❌

operationalAlertsService   → (INSERT only)                  → operational_alerts       → painéis industriais     → parcial
tpmNotifications (opt)     → maybePersistAlertRow           → alerts                   → GET /api/alerts         → parcial
DSR lifecycle              → dsrNotificationService         → notifications (LGPD)     → sem UI web              → ❌
ManuIA eventos             → manuiaInboxIngestService       → manuia_inbox_notif.      → /manutencao-ia/app/*    → ManuIA App ✅
```

### Resultado estruturado

```json
{
  "producers": [
    {
      "module": "Task Reminders",
      "service": "reminderSchedulerService.js",
      "channel": "unifiedMessaging → app_notifications",
      "nc_integrated": true
    },
    {
      "module": "Operational Realtime",
      "service": "operationalRealtimeCoordinator.js",
      "channel": "unifiedMessaging → app_notifications",
      "nc_integrated": true
    },
    {
      "module": "Operational Actions / Autonomy",
      "service": "operationalActionExecutor.js",
      "channel": "unifiedMessaging → app_notifications",
      "nc_integrated": true
    },
    {
      "module": "App Communications (replies)",
      "service": "appCommunicationService.js",
      "channel": "unifiedMessaging → app_notifications",
      "nc_integrated": true
    },
    {
      "module": "AI Incidents (admin)",
      "service": "routes/admin/incidents.js",
      "channel": "unifiedMessaging → app_notifications",
      "nc_integrated": true
    },
    {
      "module": "AI Incidents (impetus admin)",
      "service": "routes/impetusAdmin/incidents.js",
      "channel": "unifiedMessaging → app_notifications",
      "nc_integrated": true
    },
    {
      "module": "TPM",
      "service": "tpmNotifications.js",
      "channel": "appImpetusService → app_impetus_outbox + alerts (opt)",
      "nc_integrated": false
    },
    {
      "module": "IA Proativa",
      "service": "jobs/proactiveAI.js, aiProactiveMessagingService.js",
      "channel": "appImpetusService → app_impetus_outbox",
      "nc_integrated": false
    },
    {
      "module": "Executive Mode",
      "service": "executiveMode.js",
      "channel": "appImpetusService → app_impetus_outbox",
      "nc_integrated": false
    },
    {
      "module": "Operational Alerts",
      "service": "operationalAlertsService.js",
      "channel": "operational_alerts table only",
      "nc_integrated": false,
      "note": "Importa unifiedMessaging mas NUNCA chama sendToUser"
    },
    {
      "module": "DSR / LGPD",
      "service": "dsrNotificationService.js",
      "channel": "notifications table",
      "nc_integrated": false
    },
    {
      "module": "ManuIA Extension",
      "service": "manuiaInboxIngestService.js",
      "channel": "manuia_inbox_notifications + web push",
      "nc_integrated": false,
      "note": "Notification Center completo DENTRO do módulo ManuIA — referência de padrão"
    },
    {
      "module": "Pró-Ação",
      "service": "routes/proacao.js",
      "channel": "none for notifications",
      "nc_integrated": false
    },
    {
      "module": "Billing (future)",
      "service": "none active",
      "channel": "n/a",
      "nc_integrated": false
    }
  ],
  "delivery_path": [
    "Producer",
    "unifiedMessagingService.sendToUser()",
    "INSERT app_notifications",
    "INSERT communications (source=app, direction=outbound)",
    "io.to(user_{id}).emit(app_notification) [sem subscribers na room]",
    "GET /api/app-communications/notifications [sem consumer web]",
    "Layout.jsx bell [estado vazio hardcoded]"
  ],
  "storage_tables": [
    "app_notifications",
    "communications",
    "app_impetus_outbox",
    "operational_alerts",
    "alerts",
    "notifications",
    "manuia_inbox_notifications",
    "ai_proactive_alerts"
  ],
  "frontend_consumers": []
}
```

---

## ETAPA 3 — Socket.IO

### Ficheiros auditados

| Ficheiro | Conteúdo relevante |
|----------|-------------------|
| `backend/src/services/unifiedMessagingService.js:48` | `emit('app_notification', {...})` → room `` `user_${recipientUserId}` `` |
| `backend/src/socket/chatSocket.js` | `join('company:'+company_id)`, `join(conversationId)` — **sem** `user_{id}` |
| `backend/src/socket/voiceStreamSocket.js` | Voz — irrelevante para NC |
| `frontend/src/chat-module/hooks/useChatSocket.js` | Escuta `new_message`, typing — **sem** `app_notification` |
| `frontend/src/components/Layout.jsx` | **Zero** uso de Socket.IO |

### Respostas

1. **Existe emit?** — **Sim**, em `unifiedMessagingService.sendToUser`.
2. **Existe join?** — **Não**, para room `user_{id}` em todo o repositório.
3. **Existe listener frontend?** — **Não** (`grep app_notification frontend/` → 0 resultados).
4. **Existe room user_{id}?** — **Emitida**, mas **nunca populada** — notificações em tempo real **não chegam** a clientes web.

### Resultado estruturado

```json
{
  "socket_emit_exists": true,
  "socket_join_exists": false,
  "frontend_listener_exists": false,
  "real_time_notifications_working": false,
  "false_positive_risk": "sent_via_socket=true na BD não significa entrega — apenas que emit foi tentado"
}
```

---

## ETAPA 4 — `app_notifications`

### Schema inferido (INSERT em `unifiedMessagingService.js`)

| Coluna | Uso |
|--------|-----|
| `id` | UUID PK |
| `company_id` | Tenant scope (escrita) |
| `recipient_id` | User UUID destinatário |
| `communication_id` | FK opcional para `communications` |
| `text_content` | Corpo (max 4000) |
| `message_type` | Default `'text'` |
| `sent_at` | Implicit (default now) — lido pela API |
| `read_at` | Nullable — marcado por rollback |
| `sent_via_socket` | Boolean — actualizado após emit |

### Writers (INSERT)

| Writer | Ficheiro |
|--------|----------|
| **Único writer canónico** | `unifiedMessagingService.sendToUser()` |

Todos os produtores NC passam por este método.

### Readers (SELECT)

| Reader | Ficheiro | Scope |
|--------|----------|-------|
| API listagem | `routes/appCommunications.js:129` | `WHERE recipient_id = $1` |
| Rollback operacional | `routes/operational.js:398` | `company_id + recipient_id` |
| Autonomia rollback | `unifiedAutonomyService.js:117` | idem |

### Mark as read

| Mecanismo | Existe? | UX normal? |
|-----------|---------|------------|
| `UPDATE app_notifications SET read_at` | **Sim** | **Não** — só em rollback operacional/autonomia |
| `PATCH /api/app-communications/notifications/:id/read` | **Não** | — |
| Frontend mark read | **Não** | — |

### Resultado estruturado

```json
{
  "writers": ["unifiedMessagingService.sendToUser"],
  "readers": [
    "GET /api/app-communications/notifications",
    "operational.js rollback",
    "unifiedAutonomyService rollback"
  ],
  "mark_as_read_exists": true,
  "mark_as_read_user_facing": false,
  "frontend_usage_exists": false,
  "data_accumulates_silently": true
}
```

---

## ETAPA 5 — API de Notificações

### Endpoint

```
GET /api/app-communications/notifications
Middleware: requireAuth + requireCompanyActive
Query: limit (max 30, default 15)
Response: { ok, notifications: [{ id, text_content, communication_id, sent_at, read_at }] }
```

### Análise

| Critério | Avaliação | Evidência |
|----------|-----------|-----------|
| Autenticação | ✅ | `protected = [requireAuth, requireCompanyActive]` |
| Tenant scoping | ⚠️ Parcial | Filtra `recipient_id = req.user.id`; **não** filtra `company_id` explicitamente (seguro se user IDs são globais únicos) |
| Paginação | ⚠️ Limit only | Sem `offset`, sem cursor |
| Filtros | ❌ | Sem `unread=true`, sem `type`, sem `since` |
| Unread count | � | Sem endpoint `/notifications/unread-count` |
| Mark read | ❌ | Sem PATCH/POST dedicado |
| Cliente frontend | ❌ | `api.js` exporta `appCommunications.list/send` — **não** `notifications` |

### Resultado estruturado

```json
{
  "api_ready": true,
  "api_complete": false,
  "tenant_safe": true,
  "production_ready": false,
  "gaps": [
    "no_offset_pagination",
    "no_unread_filter",
    "no_mark_read_endpoint",
    "no_unread_count_endpoint",
    "no_frontend_client",
    "no_company_id_in_select_where"
  ]
}
```

---

## ETAPA 6 — Frontend

### Componentes auditados

| Componente | Ficheiro | Função real |
|------------|----------|-------------|
| Notification Bell | `Layout.jsx:931-952` | Toggle dropdown |
| Notification Badge | `Layout.jsx:939-941` | `notificationCount > 0` — **sempre false** |
| Notification Panel | `Layout.jsx:943-951` | Empty state fixo — **nunca lista items** |
| Notification Drawer | **Inexistente** | — |
| Toast Context | `NotificationContext.jsx` | Success/error/warning toasts — **distinto** do NC |
| User Settings prefs | `UserSettings.jsx` `#us-notificacoes` | `app_notification_prefs` (push, sound, banner) — **prefs sem feed** |
| ManuIA Alerts tab | `ManuIAExtensionApp.jsx` | Inbox **funcional** no módulo ManuIA — padrão de referência |

### CSS

`Layout.css` contém estilos para `.notification-badge`, `.header-dropdown__empty` — **design pronto**, lógica ausente.

### Resultado estruturado

```json
{
  "ui_exists": true,
  "api_connected": false,
  "socket_connected": false,
  "badge_dynamic": false,
  "notification_panel_complete": false,
  "confusion_risk": "NotificationContext (toasts) vs Layout bell (NC) vs UserSettings prefs — três sistemas 'notificação' desconectados"
}
```

---

## ETAPA 7 — Gap Analysis

### Backend vs Frontend

| Camada | Backend | Frontend | Gap |
|--------|---------|----------|-----|
| Persistência | ✅ Activa | ❌ Não lê | **Crítico** |
| API REST | ⚠️ Mínima | ❌ Não chama | **Crítico** |
| Socket push | ⚠️ Emit sem join | ❌ Sem listener | **Crítico** |
| Mark read | ⚠️ Só rollback | ❌ | **Alto** |
| Badge count | N/A | ❌ Hardcoded 0 | **Alto** |
| Preferências user | ✅ API conta | ⚠️ Salva prefs sem efeito no bell | **Médio** |

### Classificação

```json
{
  "classification": "B_PARCIAL_WITH_C_ABANDONED_FRONTEND",
  "completion_percent": 38,
  "breakdown": {
    "backend_write_path": 90,
    "backend_read_api": 45,
    "mark_as_read_ux": 25,
    "socket_realtime": 20,
    "frontend_ui_shell": 15,
    "frontend_integration": 0,
    "cross_module_unification": 10
  },
  "root_cause": "Durante merge Wellington (Mar/2026), a camada unifiedMessaging/app_notifications foi consolidada no backend como substituto da Z-API. O header Layout recebeu UI de sino como placeholder estático. Evoluções subsequentes (domínios Quality/Safety/Environment, ManuIA Extension, Runtime Z) criaram sistemas paralelos de alerta/inbox sem retomar a integração web do Notification Center.",
  "secondary_causes": [
    "messagingAdapter documentado mas nunca adoptado por callers",
    "operationalAlertsService importa unifiedMessaging sem usar",
    "Documentação operational-assistance-runtime-map descreve fluxo backend completo mas assume consumer inexistente",
    "Confusão semântica: NotificationContext = toasts, não NC"
  ]
}
```

---

## ETAPA 8 — Impacto Sistémico

### Módulos dependentes ou candidatos ao NC

```json
{
  "dependent_modules": [
    {
      "module": "Subscription Billing",
      "current": "Nenhum proactivo",
      "nc_benefit": "Dias 3/5/7 via sendToUser + email — sem novo worker"
    },
    {
      "module": "Pró-Ação",
      "current": "alerts table + worker removido",
      "nc_benefit": "Automação SLA → unifiedMessaging por role/hierarchy"
    },
    {
      "module": "TPM",
      "current": "appImpetusService outbox + alerts opt",
      "nc_benefit": "Duplicar para app_notifications — visível no web sino"
    },
    {
      "module": "Qualidade / AI Incidents",
      "current": "unifiedMessaging já usado em incidents PATCH",
      "nc_benefit": "Já integrado — falta só frontend"
    },
    {
      "module": "SST / Safety domain",
      "current": "operational_alerts + event backbone",
      "nc_benefit": "Push alertas críticos ao NC + painel Safety"
    },
    {
      "module": "ESG / Environment domain",
      "current": "Event backbone + painéis",
      "nc_benefit": "Threshold breaches → NC"
    },
    {
      "module": "Workflow / Tasks",
      "current": "reminderScheduler → unifiedMessaging (já NC backend)",
      "nc_benefit": "Utilizador veria lembretes no sino"
    },
    {
      "module": "IA Proativa",
      "current": "appImpetusService only (mobile)",
      "nc_benefit": "Espelhar no web NC"
    },
    {
      "module": "Operational Alerts",
      "current": "Tabela isolada, sem push user",
      "nc_benefit": "Bridge operationalAlerts → unifiedMessaging"
    },
    {
      "module": "ManuIA",
      "current": "Inbox próprio completo (manuia_inbox_notifications)",
      "nc_benefit": "Manter inbox campo; espelhar resumo no NC web ou federar"
    },
    {
      "module": "AIOI (futuro)",
      "current": "Sem canal user-facing unificado",
      "nc_benefit": "Canal padrão para decisões HITL"
    },
    {
      "module": "DSR / LGPD",
      "current": "notifications table separada",
      "nc_benefit": "Migrar ou federar no NC"
    }
  ],
  "strategic_importance": "ALTA — Concluir o NC é force multiplier: 6+ produtores já escrevem em app_notifications invisíveis ao utilizador web; billing, Pró-Ação e alertas industriais podem reutilizar unifiedMessaging sem novos workers, filas ou Z-API. ManuIA prova que o padrão ingest→inbox→push funciona quando o frontend consome a API."
}
```

---

## ETAPA 9 — Recomendação Arquitetural

### Respostas objetivas

| # | Pergunta | Resposta |
|---|----------|----------|
| 1 | O Notification Center existe? | **Sim, parcialmente** — backend + UI shell |
| 2 | Está operacional? | **Backend sim; produto não** — dados acumulam, utilizador não vê |
| 3 | Está incompleto? | **Sim** — ~38% de conclusão end-to-end |
| 4 | Está abandonado? | **Frontend sim** — placeholder desde Mar/2026 |
| 5 | Deve ser concluído? | **Sim** — prioridade antes de billing/workers |
| 6 | Deve substituir mecanismos paralelos? | **Gradualmente sim** — NC web canónico; ManuIA campo pode manter inbox PWA |
| 7 | Abordagem correta IMPETUS? | Completar NC existente, não criar nova camada |

### Classificação final

```json
{
  "status": "INCOMPLETE_REQUIRES_COMPLETION",
  "recommended_action": "NOTIFICATION_CENTER_COMPLETION — fase implementação futura (fora desta auditoria)",
  "estimated_value": "HIGH",
  "implementation_priorities_ordered": [
    "1. Frontend: fetch GET /api/app-communications/notifications + badge unread count",
    "2. Socket: socket.join('user_'+userId) no chatSocket + listener app_notification no Layout",
    "3. API: PATCH mark-read + GET unread-count + paginação offset",
    "4. Bridge: operationalAlertsService → unifiedMessaging para alertas high severity",
    "5. Bridge: tpmNotifications + proactiveAI → dual-write app_notifications (web) + outbox (mobile)",
    "6. Billing: subscriptionBillingNotificationService → unifiedMessaging (após NC operacional)",
    "7. Deprecate: messagingAdapter ou wire callers; consolidar notifications (DSR) via federação"
  ],
  "do_not_do_first": [
    "Implementar billing notifications antes do NC",
    "Criar subscription-worker PM2",
    "Restaurar Z-API",
    "Criar nova tabela notification_center_*"
  ]
}
```

---

## ETAPA 10 — Critério de Sucesso (8 perguntas)

| # | Pergunta | Resposta |
|---|----------|----------|
| 1 | O Notification Center realmente existe? | **Sim** — infra backend + UI placeholder |
| 2 | Está funcional? | **Parcial** — escrita activa; leitura/UX inactiva |
| 3 | Está ligado ao frontend? | **Não** |
| 4 | O Socket.IO está completo? | **Não** — emit sem join/listener |
| 5 | `app_notifications` está sendo usada? | **Sim** — escrita por 6+ fluxos; leitura só API não consumida |
| 6 | O sino do sistema funciona? | **Não** — sempre vazio |
| 7 | Vale a pena concluir esta arquitetura? | **Sim** — alto ROI, infra existente |
| 8 | Deve tornar-se canal padrão? | **Sim** — `unifiedMessagingService` como write path único web; `appImpetusService` como extensão mobile |

---

## Anexo A — Mapa de sistemas “notificação” no IMPETUS (confusão actual)

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                    ECOSSISTEMA FRAGMENTADO ACTUAL                       │
├─────────────────┬───────────────────┬───────────────────────────────────┤
│ Nome UI         │ Implementação     │ Estado                            │
├─────────────────┼───────────────────┼───────────────────────────────────┤
│ Layout Bell     │ Layout.jsx        │ Placeholder — NC alvo             │
│ Toasts          │ NotificationContext│ Funcional — NÃO é NC             │
│ User Prefs      │ app_notification_ │ Salvas — sem feed                 │
│                 │ prefs             │                                   │
│ ManuIA Alertas  │ manuia_inbox_*    │ Funcional — módulo isolado        │
│ DSR             │ notifications     │ Backend only                      │
│ Op. Alerts      │ operational_alerts│ Painéis — sem sino                │
│ Mobile          │ app_impetus_outbox│ Funcional — App Impetus           │
│ NC Backend      │ app_notifications │ Escrita OK — leitura órfã          │
└─────────────────┴───────────────────┴───────────────────────────────────┘
```

---

## Anexo B — Ficheiros-chave (evidência)

| Ficheiro | Evidência |
|----------|-----------|
| `backend/src/services/unifiedMessagingService.js` | Writer + Socket emit |
| `backend/src/services/messagingAdapter.js` | 0 callers — dead code |
| `backend/src/routes/appCommunications.js:129-143` | GET notifications |
| `backend/src/routes/operational.js:394-422` | Mark read (rollback only) |
| `backend/src/server.js:1601` | setSocketIo |
| `backend/src/socket/chatSocket.js:23-27` | join company/conversation only |
| `frontend/src/components/Layout.jsx:142,939-950` | count=0, empty panel |
| `frontend/src/services/api.js:200-205` | appCommunications sem notifications |
| `frontend/src/context/NotificationContext.jsx` | Toasts only |
| `frontend/src/manuia-app/ManuIAExtensionApp.jsx` | NC funcional de referência |
| `backend/src/services/operationalAlertsService.js:6` | import unifiedMessaging unused |

---

## Anexo C — Comandos de verificação executados

```bash
grep -r "app_notification\|app_notifications\|notificationCount" frontend backend/src
grep -r "sendToUser\|unifiedMessaging" backend/src
grep -r "user_\${\|join.*user_" .
grep -r "messagingAdapter" backend/src
grep -r "app-communications/notifications" frontend
git log -S "notificationCount" -- frontend/src/components/Layout.jsx
git show d2769829b:frontend/src/components/Layout.jsx | rg notification
```

---

## Relacionamento com fases anteriores

| Fase | Conclusão | Ligação ao NC |
|------|-----------|---------------|
| AUD-WORKERS-01 | Workers removidos | Notificações billing dependem de NC, não de worker |
| FIX-SUBSCRIPTION | Suspensão scheduler | Orthogonal ao NC |
| PHASE2 | USE_EXISTING_ARCHITECTURE | Confirma unifiedMessaging como canal billing |
| **NC-01 (este doc)** | NC incompleto abandonado no FE | **Próxima fase correcta antes de billing** |

---

*Auditoria read-only concluída. Nenhum código, socket, frontend ou notificação de teste foi alterado ou criado.*
