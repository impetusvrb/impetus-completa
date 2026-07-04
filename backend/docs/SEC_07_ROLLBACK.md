# SEC-07 — Rollback

```bash
SECURITY_SOC=false
pm2 restart impetus-backend --update-env
```

```bash
git checkout -- backend/src/securitySOC/
```

SEC-01→SEC-06 permanecem intactos.
