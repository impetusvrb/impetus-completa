# SEC-01 — Rollback

## Desactivação imediata (zero downtime business)

```bash
# backend/.env
SECURITY_OBSERVATORY=false

pm2 restart impetus-backend --update-env
```

Efeito:
- Middleware torna-se no-op (1 env check)
- Boot não inicia flush timer
- Audit endpoint retorna `observatory_enabled: false`

## Remoção completa (se necessário)

1. `SECURITY_OBSERVATORY=false`
2. Remover bloco SEC-01 boot em `server.js` (opcional — inofensivo com flag off)
3. Remover middleware line (opcional)
4. Remover route `/security-observatory` em `audit.js` (opcional)

**Não afecta:** Event Governance, Cognitive Core, ECO, rotas business.

## Reversão código

```bash
git checkout HEAD -- backend/src/securityObservatory/
git checkout HEAD -- backend/src/server.js backend/src/routes/audit.js
```

## Verificação pós-rollback

```bash
curl -s http://127.0.0.1:4000/health
node backend/src/tests/securityObservatory/SEC_01_OBSERVATORY_AUDIT.test.js
```

Com flag false, testes 08+ podem usar `force: true` no ingest — observatory module permanece no repo.
