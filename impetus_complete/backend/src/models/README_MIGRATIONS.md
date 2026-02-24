# Migrações do Banco de Dados

## Ordem recomendada

1. **complete_schema.sql** – Schema principal (tabelas, FKs, índices básicos)
2. **proacao_diag_migration.sql** – Índice ivfflat para `manual_chunks.embedding`
3. **tpm_migration.sql** – Formulário TPM (tpm_incidents, tpm_shift_totals, tpm_form_sessions)

## Índice ivfflat (pgvector)

O arquivo `proacao_diag_migration.sql` cria o índice:

```sql
CREATE INDEX IF NOT EXISTS idx_manual_chunks_embedding 
ON manual_chunks USING ivfflat (embedding) WITH (lists = 100);
```

**Importante:** Esse índice acelera buscas de similaridade (`<=>`) em `manual_chunks`. Execute após ter registros na tabela (o ivfflat funciona melhor com dados existentes).

**Comando:**
```bash
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f backend/src/models/proacao_diag_migration.sql
```
