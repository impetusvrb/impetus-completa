# Manual — Atualização Container Enterprise

**Certificação:** CERT-ONPREM-CONTAINER-01

---

## 1. Princípio

Actualizações Docker **substituem apenas a imagem** (código em `/app`). Volumes `${IMPETUS_HOME}` **permanecem intactos**:

- Base de dados (`database/pgdata`)
- Uploads
- Estado cognitivo (`data/`)
- Licença (`licenses/`)
- Config (`config/.env`)
- Backups

---

## 2. Pré-update

```bash
cd /var/www/impetus-completa

# Precheck enterprise
docker compose exec backend node scripts/enterprise/update-precheck.js

# Backup obrigatório
docker compose exec backend node scripts/enterprise/backup-enterprise.js
# ou scripts host existentes
```

Verificar:

- [ ] Backup recente em `${IMPETUS_HOME}/backups/`
- [ ] `migrate:status` sem pendências críticas
- [ ] Licença válida (`license-admin status`)

---

## 3. Procedimento de update

### 3.1 Obter nova versão

```bash
git pull   # ou artefacto de release IMPETUS
```

### 3.2 Rebuild e redeploy

```bash
export IMPETUS_IMAGE_TAG=v1.2.3   # opcional
docker compose build --pull
docker compose up -d
```

O entrypoint executa **migrations automaticamente**; PM2 Runtime reinicia `impetus-backend` / `impetus-frontend` com o mesmo contrato certificado.

Verificar PM2 após update:

```bash
docker compose exec backend pm2 list
docker compose exec frontend pm2 list
```

### 3.3 Bootstrap

**Não definir** `ENTERPRISE_BOOTSTRAP_ADMIN_PASSWORD` em upgrades — bootstrap só para BD vazia.

### 3.4 Verificação pós-update

```bash
docker compose ps
curl -sf http://localhost/health
docker compose exec backend node scripts/enterprise/verify-enterprise.js
docker compose exec backend node scripts/enterprise/health-enterprise.js
```

---

## 4. Rollback

### 4.1 Rollback de imagem

```bash
export IMPETUS_IMAGE_TAG=<tag-anterior>
docker compose up -d
```

### 4.2 Rollback de dados

Usar restore enterprise:

```bash
docker compose exec backend node scripts/enterprise/restore-enterprise.js \
  --archive=/opt/impetus/backups/impetus-backup-YYYYMMDD.tar.gz \
  --dry-run
```

Com confirmação `--yes` conforme `MANUAL-RESTORE.md`.

**Migrations:** forward-only — rollback de schema requer restore de BD, não downgrade de imagem isolado.

---

## 5. Update sem downtime (single-node)

1. Backup
2. `docker compose up -d --build` — Docker recria containers com rolling implícito (single replica)
3. Nginx mantém conexões durante rebuild (~30–120s indisponibilidade breve)

Para zero-downtime: load balancer + segunda instância (fora scope CONTAINER-01).

---

## 6. Actualizar apenas backend ou frontend

```bash
docker compose up -d --build backend
docker compose up -d --build frontend
```

Frontend rebuild requer `--build` (Vite embed no build).

---

## 7. Actualizar PostgreSQL

Major version PG: seguir guia oficial PostgreSQL + backup/restore.

Não incluído nesta certificação — planear em janela de manutenção.

---

## 8. Checklist pós-update

- [ ] `/health` e `/api/health` OK
- [ ] Login admin funcional
- [ ] Upload teste
- [ ] Licença `state: valid` ou `disabled`
- [ ] Logs sem erros críticos
- [ ] Event Backbone / Pulse operacionais (VALIDATION-01)

---

## Referências

- `MANUAL-DOCKER.md`
- `MANUAL-BACKUP.md`
- `MANUAL-RESTORE.md`
- `CERT-ONPREM-DATA-01.md`
