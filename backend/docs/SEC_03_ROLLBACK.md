# SEC-03 — Rollback

```bash
SECURITY_THREAT_INTELLIGENCE=false
pm2 restart impetus-backend --update-env
```

Threat Profile store em memória é descartado. SEC-01 e SEC-02 permanecem intactos.

Código reversível via git checkout de `backend/src/securityThreatIntelligence/`.
