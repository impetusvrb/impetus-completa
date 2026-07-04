# SEC-02 — Rollback

```bash
SECURITY_CORRELATION_ENGINE=false
pm2 restart impetus-backend --update-env
```

Remove subscrição ao Event Bus. Incident store em memória é descartado.

Código reversível via git checkout de `backend/src/securityCorrelation/`.
