# SEC-04 — Rollback

```bash
SECURITY_RUNTIME_INTEGRITY=false
pm2 restart impetus-backend --update-env
```

Para remover código:

```bash
git checkout -- backend/src/securityRuntimeIntegrity/
```

Baseline SECURITY-BASELINE-01 permanece intacta.
