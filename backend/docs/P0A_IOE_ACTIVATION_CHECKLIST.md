# P0A — IOE Activation Checklist

**Gerado:** 2026-06-14T22:44:59.584Z

---

## Checklist explícito (P0A.3)

```json
{
  "AIOI_OUTBOX_WORKER_ENABLED": {
    "key": "IMPETUS_AIOI_OUTBOX_WORKER_ENABLED",
    "value": "(unset → default false)",
    "enabled": false,
    "boot_active": false
  },
  "AIOI_CONTINUOUS_RUNTIME_ENABLED": {
    "key": "IMPETUS_AIOI_CONTINUOUS_RUNTIME_ENABLED",
    "value": "(unset → default false)",
    "enabled": false,
    "boot_active": false
  },
  "EVENT_PIPELINE_BOOT": {
    "env_enabled": false,
    "boot_ok": false,
    "boot_detail": {
      "ok": false,
      "reason": "not_found_in_log"
    }
  },
  "workers_enabled": false,
  "pipeline_enabled": false,
  "activation_allowed": false,
  "note": "Validação read-only. Activacao explicita pelo operador — sem alteracao automatica."
}
```

| Flag | Estado |
|------|--------|
| AIOI_OUTBOX_WORKER_ENABLED | ⏸ desactivado (operador) |
| AIOI_CONTINUOUS_RUNTIME_ENABLED | ⏸ desactivado (operador) |
| EVENT_PIPELINE_BOOT | ⏸ pendente |

## Passos de activação (manual)

1. Definir IMPETUS_AIOI_OUTBOX_WORKER_ENABLED=true
2. Definir IMPETUS_AIOI_CONTINUOUS_RUNTIME_ENABLED=true
3. Definir IMPETUS_EVENT_PIPELINE_ENABLED=true
4. Confirmar IMPETUS_AIOI_ENABLED=true e IMPETUS_AIOI_PILOT_TENANTS
5. pm2 restart impetus-backend --update-env (decisão manual do operador)
6. Revalidar GET /api/operations/continuous/readiness

---

*Nenhuma alteração automática de env vars. Nenhum restart automático.*
