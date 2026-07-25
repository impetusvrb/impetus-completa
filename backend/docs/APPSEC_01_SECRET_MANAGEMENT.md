# APPSEC-01 — Secret Management

## Inventário obrigatório (produção)

| Variável | Mínimo |
|----------|--------|
| `JWT_SECRET` | 16 chars, não placeholder |
| `IMPETUS_ADMIN_JWT_SECRET` | 16 chars |
| `TIME_CLOCK_ENC_KEY` ou `ENCRYPTION_KEY` | 16 chars, **sem** `impetus-default-key-32b` |

## Scanner (boot)

- Ficheiros `.env.bak*`, `.env.backup*`, `.env.sec*`, etc. → **boot fail** em produção
- Artefactos `docs/evidence/*.json` com `pm2_env` / segredos → warning

## Fallbacks proibidos

```javascript
// REMOVIDO em produção via runtime validator:
'impetus-default-key-32b'
'changeme', 'dev-secret', ...
```

## Acções operacionais

1. **Remover** todos os backups `.env.*` do servidor (manter só `.env` activo)
2. **Rotacionar** segredos se backups estiveram expostos
3. **Sanitizar** scripts de go-live que gravam `pm2 jlist` completo
4. Usar vault / painel de secrets do hosting

## Rollback

`IMPETUS_APPSEC_SECRET_MGMT=false` desactiva scanner (não recomendado em prod).
