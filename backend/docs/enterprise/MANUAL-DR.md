# Manual de Disaster Recovery — IMPETUS Enterprise

## Objectivos (contrato INFRA-01)

| Métrica | Target |
|---------|--------|
| RPO | ≤ 24h |
| RTO | ≤ 4h |

## Cenários

### 1. BD corrupta

1. Parar backend (`pm2 stop impetus-backend`)
2. Restore `--only=database`
3. `verify-enterprise.sh` + `health-enterprise.sh`

### 2. Perda uploads / estado cognitivo

Restore `--only=uploads,data` sem tocar BD.

### 3. Host perdido

1. Provisioning novo servidor (INFRA-01)
2. Instalar PostgreSQL, Node 20, PM2, Nginx
3. Restaurar `${IMPETUS_HOME}` completo ou restore script
4. Ajustar DNS/TLS

### 4. Update falhado

1. Rollback `app/` versão anterior
2. Restore BD se migration irreversível

## Checklist pós-DR

- [ ] `verify-enterprise.sh` PASS
- [ ] `health-enterprise.sh` PASS
- [ ] Login admin OK
- [ ] Dashboard carrega
- [ ] Upload teste OK
- [ ] Event Backbone flags conforme runbook

## Validação periódica

Trimestral: restore `--dry-run` + `npm run enterprise:rollback-validation` em **staging com disco ≥10 GB livres**.

**Evidência 2026-07-01:** ROLLBACK-01 REPROVADA neste host (disco 100%) — ver `CERT-ENTERPRISE-ROLLBACK-01.md`.  
**Qualificação ambiente:** ENV-QUALIFICATION-01 REPROVADA — executar `npm run enterprise:env-qualification` antes de re-tentar DR.
