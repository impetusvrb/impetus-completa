# SEC-05 — Channels

## Implementados

| Canal | Descrição |
|-------|-----------|
| `console` | Log `[SEC-05][SEVERITY] title` |
| `structured_log` | JSON line com notificationId, severity, incidentId |
| `audit` | Armazenado no Notification Store (endpoint) |
| `webhook` | POST JSON se `SECURITY_NOTIFICATION_WEBHOOK_URL` configurado |

## Adapters (interface only)

| Adapter | Estado | Futuro |
|---------|--------|--------|
| Email | skipped | gustavo@, security-team@ |
| Push | skipped | mobile app |
| SMS | skipped | Wellington, Gustavo |

Nenhum envio externo obrigatório nesta fase.

## Configuração webhook

```bash
SECURITY_NOTIFICATION_WEBHOOK_URL=http://127.0.0.1:4000/api/internal/security-webhook
```
