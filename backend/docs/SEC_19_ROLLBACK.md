# SEC-19 — Rollback

## Procedimento

1. Definir `SECURITY_OPERATIONAL_CERTIFICATION=false` em `.env`
2. Reiniciar processo PM2 com `--update-env` (quando aplicável)
3. Verificar endpoint retorna `enabled: false` e `dashboard: null`

## Impacto

SEC-19 é **aditivo e consultivo**. Rollback não afecta SEC-01→18.

## Verificação pós-rollback

```bash
curl -H "Authorization: Bearer …" \
  https://…/api/audit/security-operational-certification
```

Esperado: `enabled: false`, disclaimer de certificação inactiva.

## Nota

Nenhuma alteração de nginx, firewall, PM2 config ou SSH é efectuada por SEC-19.
