# Manual — Rollback Enterprise

**Certificações:** CERT-ONPREM-VALIDATION-01 Parte 8 · CERT-ENTERPRISE-ROLLBACK-01

---

## 1. Pré-requisitos

- Backup válido com `manifest.json` (CERT-ENTERPRISE-BACKUP-01)
- Espaço em disco: **≥ 2× tamanho do backup** (dump + extract)
- PostgreSQL client (`pg_restore`, `psql`)
- Scripts Enterprise em `backend/scripts/enterprise/`

---

## 2. Validar backup antes de rollback

```bash
cd backend
node scripts/enterprise/backup-enterprise.js --repair-manifest=backups/backup_YYYYMMDD_HHMMSS  # se necessário
node scripts/enterprise/restore-enterprise.js --dry-run --yes --backup=backups/backup_...
```

---

## 3. Rollback completo (produção)

**Atenção:** sobrescreve BD, uploads, data, config.

```bash
pm2 stop impetus-backend   # reduzir writes
node scripts/enterprise/restore-enterprise.js --backup=backups/backup_... --yes
node scripts/enterprise/verify-enterprise.js
node scripts/enterprise/health-enterprise.js
pm2 restart impetus-backend --update-env
```

---

## 4. Rollback parcial

```bash
# Só base de dados
node scripts/enterprise/restore-enterprise.js --backup=... --only=database --yes

# Só uploads + estado cognitivo
node scripts/enterprise/restore-enterprise.js --backup=... --only=uploads,data --yes
```

---

## 5. Validação DR (sem sobrescrever produção)

```bash
npm run enterprise:rollback-validation
npm run enterprise:rollback-validation -- --backup=backups/backup_...
```

Valida: manifest, dry-run, pg_restore em BD isolada, extract em sandbox.

**Requisito:** host com disco livre suficiente (ver CERT-ENTERPRISE-ROLLBACK-01).

---

## 6. Checklist pós-rollback

- [ ] `verify-enterprise.js` PASS  
- [ ] `health-enterprise.js` PASS  
- [ ] Login admin OK  
- [ ] Upload teste OK  
- [ ] `license-admin status` OK  
- [ ] Event Backbone operacional  

---

## Referências

- `CERT-ENTERPRISE-ROLLBACK-01.md`
- `MANUAL-DR.md`
- `MANUAL-BACKUP.md`
- `MANUAL-RESTORE.md`
