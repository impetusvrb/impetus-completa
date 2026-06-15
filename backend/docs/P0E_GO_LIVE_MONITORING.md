# P0E — Go-Live Monitoring

**Gerado:** 2026-06-15T00:55:26.068Z  
**Modo:** READ ONLY · OBSERVATIONAL ONLY

## Veredicto

```json
{
  "phase": "P0E",
  "pass": false,
  "verdict": "GO_LIVE_PENDING",
  "reason": "AWAITING_OPERATOR_ACTIVATION"
}
```

## P0E.1 — Go-Live Detection

```json
{
  "go_live_detected": false,
  "activation_timestamp": null,
  "pipeline_activated": false,
  "workers_active": false,
  "first_ioe_at": null,
  "first_outbox_delivery_at": null,
  "reason": "AWAITING_OPERATOR_ACTIVATION",
  "flags": {
    "IMPETUS_AIOI_OUTBOX_WORKER_ENABLED": false,
    "IMPETUS_AIOI_CONTINUOUS_RUNTIME_ENABLED": false,
    "IMPETUS_EVENT_PIPELINE_ENABLED": false
  }
}
```

### Activacao pendente

1. `IMPETUS_AIOI_OUTBOX_WORKER_ENABLED=true`
2. `IMPETUS_AIOI_CONTINUOUS_RUNTIME_ENABLED=true`
3. `IMPETUS_EVENT_PIPELINE_ENABLED=true`
4. `pm2 restart impetus-backend --update-env`
5. `Aguardar primeiro IOE e re-executar GET /api/operations/golive/status`
