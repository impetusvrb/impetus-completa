# Checklist de Deploy - Unificação App Impetus

**Para:** Equipe Gustavo / Deploy em Produção  
**Data:** 2026-03-07  
**Objetivo:** Colocar em produção as alterações da unificação Impetus Comunica IA + App Impetus.

---

## Pré-requisitos

- [ ] Acesso SSH ao servidor de produção (72.61.221.152)
- [ ] Acesso ao banco PostgreSQL de produção
- [ ] Backup do banco de dados realizado
- [ ] Código commitado e disponível no repositório (branch main)

---

## Ordem de Execução

### 1. Backup do Banco
```bash
pg_dump -U <user> -d impetusdb -F c -f impetus_backup_$(date +%Y%m%d_%H%M).dump
```

### 2. Migration (criar tabela app_impetus_outbox)

**Opção A – Script isolado (recomendado se run-all-migrations falhar):**
```bash
cd /caminho/para/impetus_complete/backend
node -r dotenv/config scripts/run-app-impetus-migration.js
```

**Opção B – Migration manual via psql:**
```bash
psql -U <user> -d impetusdb -f backend/src/models/app_impetus_outbox_migration.sql
```

**Opção C – Run-all-migrations (se tiver permissões):**
```bash
cd backend
node -r dotenv/config scripts/run-all-migrations.js
```

### 3. Deploy do Backend
```bash
cd /caminho/para/impetus_complete
git pull origin main   # ou o branch correto
cd backend
npm install           # se houver novas dependências
pm2 restart impetus-backend   # ou o nome do processo
# ou: pm2 restart ecosystem.config.cjs --env production
```

### 4. Deploy do Frontend
```bash
cd frontend
npm install
npm run build
# Copiar dist/ para o servidor web ou reiniciar container nginx
```

### 5. Verificações Pós-Deploy
- [ ] `curl http://localhost:4000/health` retorna 200
- [ ] Login funciona
- [ ] Configurações → aba "Comunicação" aparece (não mais Z-API)
- [ ] `GET /api/app-impetus/status` retorna `{ channel: 'app_impetus', status: 'connected' }`

---

## Rollback (se necessário)

1. Restaurar backup do banco (se migration causou problema)
2. Reverter código: `git checkout <commit-anterior>`
3. Reiniciar backend: `pm2 restart impetus-backend`
4. Rebuild e deploy do frontend anterior

---

## Contato

Dúvidas sobre o deploy: Wellington / contato@impetus.com.br
