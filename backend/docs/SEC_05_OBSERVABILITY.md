# SEC-05 — Observabilidade

## Métricas

| Métrica | Descrição |
|---------|-----------|
| `notifications_generated` | Notificações novas |
| `notifications_grouped` | Merges por deduplicação |
| `critical_notifications` | Severidade CRITICAL |
| `high_notifications` | Severidade HIGH |
| `notification_latency` | ms último ciclo |
| `delivery_attempts` | Tentativas de entrega |
| `delivery_failures` | Falhas de entrega |

## Dashboard KPIs

Total, Pending, Acknowledged, by_severity, by_type, by_channel

## Logs

Prefixo `[SEC-05]` — boot, console channel, structured JSON.
