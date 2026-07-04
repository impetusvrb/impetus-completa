# SEC-13 — Rollback

Cada AUTO_EXECUTABLE inclui rollback:

| Acção | Rollback |
|-------|----------|
| `increase_log_level` | Restaurar nível anterior |
| `open_internal_incident` | Fechar incidente interno |
| snapshots/reports | Descarte lógico (journal) |

```env
SECURITY_CONTROLLED_EXECUTION=false
pm2 restart impetus-backend --update-env
```

SEC-01→12 permanecem operacionais.

API interna: `rollbackExecution(executionId)` registada no journal.
