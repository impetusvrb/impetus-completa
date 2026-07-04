# SEC-06 — Rollback

```bash
SECURITY_RESPONSE_ORCHESTRATOR=false
pm2 restart impetus-backend --update-env
```

Rollback por resposta: API interna `rollbackResponse(responseId)` — reverte acções Assist.

Protect plans nunca executados — rollback N/A.

```bash
git checkout -- backend/src/securityResponse/
```
