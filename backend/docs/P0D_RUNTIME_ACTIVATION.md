# P0D — Runtime Activation

**Gerado:** 2026-06-15T00:23:28.901Z

## Veredicto

```json
{
  "phase": "P0D",
  "pass": false,
  "verdict": "CONTINUOUS_RUNTIME_NOT_ENABLED",
  "reason": "CONTINUOUS_RUNTIME_NOT_ENABLED"
}
```

## P0D.1 — Activation validation

```json
{
  "runtime_activated": false,
  "reason": "CONTINUOUS_RUNTIME_NOT_ENABLED",
  "workers_online": false,
  "pipeline_active": false,
  "scheduler_active": false,
  "leases_valid": false,
  "edge_queues_active": false,
  "flags": {
    "IMPETUS_AIOI_OUTBOX_WORKER_ENABLED": false,
    "IMPETUS_AIOI_CONTINUOUS_RUNTIME_ENABLED": false,
    "IMPETUS_EVENT_PIPELINE_ENABLED": false
  }
}
```

### Passos operador

1. `IMPETUS_AIOI_OUTBOX_WORKER_ENABLED=true`
2. `IMPETUS_AIOI_CONTINUOUS_RUNTIME_ENABLED=true`
3. `IMPETUS_EVENT_PIPELINE_ENABLED=true`
4. `pm2 restart impetus-backend --update-env`
