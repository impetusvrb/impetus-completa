# ECO-03 — Implementação dos Adapters

**Fase:** 3 · **Data:** 2026-07-02

---

## chatOperationalGovernanceAdapter.js

**Políticas:** `CHAT_OPERATIONAL` (OAE, chat) · `AI_PROACTIVE` (organizationalAI)

### API pública (interna)

| Função | Uso |
|--------|-----|
| `dispatchOperationalActionNotification(companyId, input)` | operationalActionExecutor |
| `dispatchChatRealtimeNotification(companyId, input)` | operationalRealtimeCoordinator |
| `dispatchOrganizationalEscalation(companyId, input)` | organizationalAI |
| `buildGovernanceEvent(input)` | Testes / audit |
| `getAuditStatus()` | `/api/audit/eco-convergence/status` |

### Pipeline

```text
input → buildGovernanceEvent
      → evaluatePrepareAndExecute (EG v1 — inalterado)
      → [flag OFF] shadow: legacy + compareShadow
      → [flag ON]  governance: executePlan (notificationCenterExecutor / chatExecutor / appImpetusExecutor)
```

### Event shapes

**OAE:**
- `sourceModule`: `operationalActionExecutor`
- `eventType`: `operational_decision` | `autonomous_suggestion`
- `category`: `operational`

**Chat realtime:**
- `sourceModule`: `operationalRealtimeCoordinator`
- `eventType`: routing.event_type (ex. `machine_stop`)
- `payload.recipientUserIds`: targets notificados

**Org AI:**
- `sourceModule`: `organizationalAI`
- `category`: `ai`
- `eventType`: `ai_proactive`
- `payload.phones`: destinatários WhatsApp

---

## ncBridgeMirrorGovernanceAdapter.js

**Política:** `NC_BRIDGE_MIRROR`

### API

| Função | Uso |
|--------|-----|
| `dispatchNcBridgeMirror(companyId, input)` | Espelho NC para unifiedMessaging |
| `getAuditStatus()` | Audit eco-convergence |

### Event shape

- `sourceModule`: `unifiedMessagingService`
- `category`: `system`
- `severity`: `high` | `critical`
- `channels`: `notification_center`

Activado quando `ECO_OAE_VIA_EG` ou `ECO_CHAT_VIA_EG` = true (NC mirror alinhado aos fluxos chat/OAE).

---

## Regras de negócio

- **Nenhuma regra nova** — matching usa catálogo existente (`eventPolicyCatalog.js` inalterado).
- Executores reutilizados: `notificationCenterExecutor`, `chatExecutor`, `appImpetusExecutor`.
- Fallback legacy em erro de evaluate (resiliência operacional).

---

## Ficheiros

```
backend/src/services/governanceAdapters/chatOperationalGovernanceAdapter.js
backend/src/services/governanceAdapters/ncBridgeMirrorGovernanceAdapter.js
backend/src/services/ecoConvergenceFlags.js
```
