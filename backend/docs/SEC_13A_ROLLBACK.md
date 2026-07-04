# SEC-13A — Rollback

Rollback **independente** por módulo:

```env
SECURITY_<MODULE_FLAG>=false
pm2 restart impetus-backend --update-env
```

Estado dashboard: `ROLLBACK` (registo lógico SEC-13A).

Rollback completo ecossistema: desactivar flags SEC-01→13 sequencialmente inverso.

SEC-01→13 código **inalterado**.
