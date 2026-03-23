# ManuIA – Guia de Deploy Seguro

## Pré-requisitos

- PostgreSQL com `companies` e `users`
- `openai` no `package.json` (já presente)
- `OPENAI_API_KEY` no `.env` (para pesquisa por IA)

## Passos

### 1. Backup do banco

```bash
cd backend
chmod +x scripts/backup-db-before-manuia.sh
./scripts/backup-db-before-manuia.sh
```

Ou manualmente:
```bash
PGPASSWORD="$DB_PASSWORD" pg_dump -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -F p -f backups/pre_manuia_$(date +%Y%m%d_%H%M).sql
```

### 2. Migrations

```bash
cd backend
npm run migrate
```

Ou executar o arquivo diretamente:
```bash
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f src/models/manuia_migration.sql
```

### 3. Feature flag (opcional)

Por padrão o ManuIA fica **ativo**.

Para desativar rapidamente sem reverter código:
```bash
# No .env ou variável de ambiente
ENABLE_MANUIA=false
```

Reinicie o backend após alterar.

### 4. Testar

```bash
# Health (requer auth + perfil manutenção)
curl -H "Authorization: Bearer $TOKEN" http://localhost:4000/api/manutencao-ia/health

# Máquinas
curl -H "Authorization: Bearer $TOKEN" http://localhost:4000/api/manutencao-ia/machines
```

### 5. Rollback (emergência)

**Código:**
```bash
git revert <commit-hash>
# ou
git checkout main
```

**Banco** (remove apenas tabelas ManuIA; não altera work_orders nem monitored_points):
```bash
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f src/models/rollback_manuia_migration.sql
```

Restaurar backup completo:
```bash
psql -h $DB_HOST -U $DB_USER -d $DB_NAME < backups/pre_manuia_YYYYMMDD_HHMM.sql
```
