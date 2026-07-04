# SEC-14 — Observabilidade Adaptive Blocking

## Métricas (in-memory)

| Métrica | Descrição |
|---------|-----------|
| `adaptive_blocking_events` | Eventos de classificação/registro |
| `watchlist_ips` | IPs em WATCHLIST |
| `quarantine_candidates` | IPs em QUARANTINE ou BLOCK_CANDIDATE |
| `manual_reviews` | IPs em MANUAL_REVIEW |
| `reputation_updates` | Actualizações de reputação |
| `behavior_profiles` | Perfis comportamentais gerados |
| `fingerprints_generated` | Fingerprints técnicos criados |
| `blocking_recommendations` | Recomendações emitidas |
| `evaluations` | Ciclos de avaliação |
| `evaluation_time_ms` | Duração último ciclo |

## Endpoint audit

```
GET /api/audit/security-adaptive-blocking
```

Payload inclui:
- `metrics` — snapshot completo
- `dashboard` — DTO `adaptive_blocking_v1`
- `recommendations` — últimas 20 recomendações
- `blacklist` — últimas 20 entradas

## Logs boot

```
[SEC-14] Enterprise Adaptive Blocking activo (observe only — nenhum bloqueio executado)
[SEC-14_EVAL] — warnings em falha de avaliação periódica
[SEC-14_BOOT] — falha no bootstrap (server.js)
```

## Intervalo

Controlado por `SECURITY_ADAPTIVE_BLOCKING_EVAL_MS` (default 60000ms, min 15s, max 5min).

## Evidências

`backend/docs/evidence/sec-14/criteria.json`

## Comando teste

```bash
node backend/src/tests/securityAdaptiveBlocking/SEC_14_ADAPTIVE_BLOCKING.test.js
```
