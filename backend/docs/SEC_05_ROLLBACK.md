# SEC-05 — Rollback

```bash
SECURITY_NOTIFICATION_CENTER=false
pm2 restart impetus-backend --update-env
```

Notification store em memória descartado. SEC-01→SEC-04 intactos.

```bash
git checkout -- backend/src/securityNotification/
```
