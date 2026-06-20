# AUD-NOTIFICATION-CENTER-02-FIX — Relatório de Conclusão Operacional

**Data:** 2026-06-19  
**Origem:** [AUD_NOTIFICATION_CENTER_01_REPORT.md](./AUD_NOTIFICATION_CENTER_01_REPORT.md)  
**Modo:** implementação aditiva — backward compatible  
**Escopo:** concluir Notification Center existente — **sem** billing, Pró-Ação, TPM, workers ou Z-API

---

## Resumo executivo

O Notification Center passou de **infraestrutura backend órfã + UI placeholder** para **componente operacional end-to-end**: API reforçada, room Socket.IO `user_{id}`, sino dinâmico no `Layout`, listener tempo real e observabilidade read-only.

| Critério | Estado |
|----------|--------|
| Backend API completada | **Sim** |
| Socket user rooms | **Sim** |
| Frontend conectado | **Sim** |
| Badge dinâmico | **Sim** |
| Tempo real | **Sim** |
| Mark read | **Sim** |
| Observabilidade | **Sim** |
| Nova arquitetura | **Não** |
| Z-API / workers | **Não** |
| Testes backend | **11/11** |
| Testes frontend | **4/4** (cenários estáticos) |

---

## Causa raiz (recapitulação NC-01)

Durante merge Wellington (Mar/2026), `unifiedMessagingService` e `app_notifications` foram consolidados no backend. O sino em `Layout.jsx` ficou com `useState(0)` fixo. Socket emitia para `user_{id}` sem join. Produtores escreviam notificações **invisíveis** ao utilizador web.

**Remediação desta fase:** ligar peças existentes — sem novas tabelas, filas ou workers.

---

## Alterações realizadas

### Novos ficheiros

| Ficheiro | Função |
|----------|--------|
| `backend/src/services/notificationCenterService.js` | Listagem, unread count, mark read, métricas, status auditoria |
| `frontend/src/hooks/useNotificationCenter.js` | Fetch API + listener `app_notification` |
| `backend/src/tests/audit/AUD_NOTIFICATION_CENTER_02_FIX.test.js` | 11 testes backend |
| `frontend/src/tests/notification-center/AUD_NOTIFICATION_CENTER_02_FIX.cjs` | 4 cenários frontend |
| `frontend/src/hooks/useNotificationCenter.test.jsx` | Testes vitest (requer `@testing-library/react` no ambiente) |

### Ficheiros modificados

| Ficheiro | Alteração |
|----------|-----------|
| `backend/src/routes/appCommunications.js` | Endpoints unread-count, mark-read; listagem com offset/unread |
| `backend/src/services/unifiedMessagingService.js` | Métricas entrega; `isSocketEnabled()` |
| `backend/src/socket/chatSocket.js` | `socket.join(\`user_${user.id}\`)` |
| `backend/src/routes/audit.js` | `GET /api/audit/notification-center/status` |
| `frontend/src/services/api.js` | `appCommunications.notifications.*` |
| `frontend/src/components/Layout.jsx` | Hook NC; dropdown com lista |
| `frontend/src/components/Layout.css` | Estilos lista notificações (DS Industrial) |
| `frontend/src/chat-module/hooks/useChatSocket.js` | Export `getSocket()` partilhado |

---

## ETAPA 1 — Endpoints criados / expandidos

### `GET /api/app-communications/notifications/unread-count`

- Middleware: `requireAuth` + `requireCompanyActive`
- Scope: `recipient_id = req.user.id` + `company_id = req.user.company_id`
- Resposta: `{ ok: true, unread_count: N }`

### `PATCH /api/app-communications/notifications/:id/read`

- Idempotente (`COALESCE(read_at, now())`)
- Bloqueia cross-user (WHERE `recipient_id` + `company_id`)
- 404 se notificação não pertence ao utilizador

### `GET /api/app-communications/notifications` (expandido)

Query params:

| Param | Descrição |
|-------|-----------|
| `limit` | Max 50, default 15 |
| `offset` | Paginação |
| `unread=true` | Só não lidas |

Resposta: `{ ok, notifications, limit, offset }`

**Ordem de rotas:** `unread-count` → `:id/read` → list (evita conflito Express).

---

## ETAPA 2 — Socket.IO

### Backend (`chatSocket.js`)

Após autenticação JWT válida:

```javascript
socket.join('company:' + user.company_id);
socket.join(`user_${user.id}`);
```

**Não alterado:** conversation rooms, chat events, voice stream.

### Frontend (`useNotificationCenter.js`)

- Reutiliza `getSocket()` exportado de `useChatSocket.js`
- Listener `app_notification` → actualiza lista + incrementa unread
- Payload compatível com emit de `unifiedMessagingService.sendToUser()`

---

## ETAPA 3 — Frontend

### Cliente API (`api.js`)

```javascript
appCommunications.notifications.list({ limit, offset, unread })
appCommunications.notifications.unreadCount()
appCommunications.notifications.markRead(id)
```

### Layout Bell

- Substituído `useState(0)` por `useNotificationCenter()`
- Badge mostra `unread_count` real
- Dropdown lista últimas 15 notificações com `text_content`, `sent_at`, estado lido
- Click em item não lido → `PATCH mark-read` + update optimista

---

## ETAPA 4 — Tempo real

Fluxo completo operacional:

```text
unifiedMessaging.sendToUser()
  → INSERT app_notifications
  → io.to(`user_${id}`).emit('app_notification', payload)
  → socket já em user room (chat connection)
  → useNotificationCenter listener
  → badge + lista actualizados sem refresh
```

---

## ETAPA 5 — Observabilidade

Reutiliza `observabilityService.incrementMetric()` — **sem novo sistema**.

| Métrica | Quando |
|---------|--------|
| `notification_delivery_attempts` | Início de `sendToUser` |
| `notification_delivery_success` | INSERT + emit OK |
| `notification_mark_read` | Mark read bem-sucedido |

### `GET /api/audit/notification-center/status`

- Auth: `requireAuth` + `requireTenantAdminRole`
- Read-only

Exemplo:

```json
{
  "ok": true,
  "socket_enabled": true,
  "user_room_enabled": true,
  "unread_notifications": 12,
  "delivery_attempts": 100,
  "delivery_success": 98,
  "mark_read_events": 82,
  "read_rate": 0.84
}
```

`read_rate` = `mark_read_events / delivery_success` (0–1).

---

## ETAPA 6 — Testes

### Backend — `AUD_NOTIFICATION_CENTER_02_FIX.test.js`

```bash
node backend/src/tests/audit/AUD_NOTIFICATION_CENTER_02_FIX.test.js
# 11 passed, 0 failed
```

Cobre: serviço, rotas, ordem Express, socket join, métricas, audit endpoint, api/hook/layout estático.

### Frontend — `AUD_NOTIFICATION_CENTER_02_FIX.cjs`

```bash
node frontend/src/tests/notification-center/AUD_NOTIFICATION_CENTER_02_FIX.cjs
# 4 passed, 0 failed
```

---

## Critério de sucesso (resposta final)

```json
{
  "notification_center_operational": true,
  "backend_api_completed": true,
  "socket_user_rooms_completed": true,
  "frontend_connected": true,
  "badge_dynamic": true,
  "realtime_updates": true,
  "mark_read_completed": true,
  "observability_added": true,
  "tests_passing": true,
  "new_architecture_created": false,
  "zapi_restored": false,
  "workers_created": false,
  "safe_for_production": true
}
```

**Nota deploy:** utilizador web precisa de ligação Socket.IO activa (token presente) para tempo real; polling manual via refresh ao abrir dropdown cobre fallback via API REST.

---

## Riscos residuais

| Risco | Mitigação |
|-------|-----------|
| Socket partilhado com chat — múltiplos listeners | `off` no cleanup do hook; eventos namespaced |
| Utilizador sem socket conectado | API REST no mount; badge correcto após login |
| `company_id` ausente em BD legada | Fallback query sem company_id (padrão operational.js) |
| Produtores mobile (outbox) não aparecem no sino | **Fora de escopo** — fase futura dual-write ou bridge |
| `NotificationContext` (toasts) vs NC | Semântica distinta — documentado; sem merge nesta fase |
| Preferências `app_notification_prefs` | Salvas em UserSettings — **não filtram** feed ainda |

---

## O que NÃO foi implementado (conforme spec)

- Billing notifications
- Pró-Ação / TPM / ESG / Workflow / Quality / Safety / AIOI bridges
- Novas tabelas ou filas
- PM2 workers ou cron
- Z-API / WhatsApp
- Notification drawer full-page (só dropdown header)

---

## Plano das próximas fases

| Fase | Conteúdo | Dependência |
|------|----------|-------------|
| **NC-03-bridge** | `operationalAlertsService` → `unifiedMessaging` para alertas high | NC operacional ✅ |
| **NC-04-mobile** | Espelhar outbox TPM/proactiva em `app_notifications` | NC operacional ✅ |
| **AUD-BILLING-NOTIF** | Escalonamento 3/5/7 via `unifiedMessaging` + email | NC operacional ✅ |
| **NC-05-prefs** | Respeitar `app_notification_prefs` no feed e push | Opcional |
| **NC-06-federation** | Unificar `notifications` (DSR) e ManuIA inbox summary | Estratégico |

---

## Diagrama pós-remediação

```text
┌──────────────────┐     sendToUser      ┌─────────────────────┐
│ Produtores       │ ──────────────────► │ app_notifications   │
│ (6+ existentes)  │                     └──────────┬──────────┘
└──────────────────┘                                │
                                                    │ GET list / unread-count
                                                    │ PATCH read
                                                    ▼
┌──────────────────┐   app_notification   ┌─────────────────────┐
│ chatSocket       │ ◄─────────────────── │ Layout Bell + Hook  │
│ user_{id} join   │                      │ Badge dinâmico      │
└──────────────────┘                      └─────────────────────┘
```

---

*Implementação aditiva concluída. Nenhuma regra de negócio, RBAC, MFA, RLS ou Truth Program foi alterada.*
