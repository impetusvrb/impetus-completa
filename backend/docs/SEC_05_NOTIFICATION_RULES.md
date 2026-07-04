# SEC-05 — Notification Rules

## Severidade → Prioridade → Canais

| Severidade | Prioridade | Canais | Intervalo mín |
|------------|------------|--------|---------------|
| CRITICAL | P0 | console, log, audit, webhook | 0 |
| HIGH | P1 | console, log, audit, webhook | 5 min |
| MEDIUM | P2 | log, audit | 15 min |
| LOW | P3 | log, audit | 1 h |
| INFORMATION | P4 | audit | 24 h |

## Perfis destinatários

| Perfil | Severidade mínima |
|--------|-------------------|
| administrator | MEDIUM |
| security | LOW |
| operations | HIGH |
| directorate | CRITICAL |

Entrega actual: `audit_only` — envio externo via adapters futuros.

## Deduplicação

Chave: `{incidentId}::{notificationType}`  
Janela: `SECURITY_NOTIFICATION_DEDUP_MS` (default 1h)

Merge actualiza summary, timeline, severity (max), groupedEventCount.
