# Aviso oficial — migration LEGACY `pgvector_semantic_search`

## Estado

A migration que alterava `manual_chunks.embedding` via **`DROP COLUMN`** + tipo **`vector(1536)`** + índice **IVFFLAT** foi **congelada**.

- **Local canónico (apenas referência / auditoria):**  
  `backend/src/models/_legacy/pgvector_semantic_search_migration.legacy.sql`
- **Removido do pipeline forward:** o ficheiro já **não** existe em `src/models/*.sql` ao nível raiz; a pasta `_legacy/` **não** é lida pelo `discoverModelsForward` (listagem só no primeiro nível).
- **Runner:** denylist permanente em `backend/scripts/migrations/migrationSafetyPolicy.js` — bloqueio **mesmo** com `IMPETUS_ALLOW_DESTRUCTIVE_MIGRATIONS=true`.

## Por que ficou LEGACY

1. **`ALTER TABLE manual_chunks DROP COLUMN IF EXISTS embedding`** — apaga **todos** os vectores armazenados nessa coluna; sem plano de backup/rebuild é **perda de memória semântica**.
2. **`CREATE INDEX … ivfflat`** sem `CONCURRENTLY` — risco de **lock** forte em `manual_chunks` durante o build.
3. **Desalinhamento produto/ops** — a evolução correcta é **migração assistida** (nova coluna, dual-read, rebuild gradual), não um DROP cego.

## Risco de regressão cognitiva

- `documentContext.searchCompanyManuals`, diagnóstico e colector PLC dependem de embeddings em `manual_chunks`.
- Apagar a coluna sem repovoamento implica **retrieval vazio** até novo processamento — regressão **funcional** (não necessariamente crash do Node, mas perda de qualidade e de RAG).

## Rebuild

Qualquer estratégia aceitável no futuro implica **regerar embeddings** (ex.: `text-embedding-3-small`, 1536 dims) e validar cobertura antes de remover colunas antigas.

## Bloqueio permanente

- Garante que **nenhuma** corrida automática de `npm run migrate` / `run-all-migrations.js` volte a aplicar este script por engano.
- Aplicação manual em BD só com **runbook** próprio e aprovação DBA, **fora** do runner.

## Leituras relacionadas

- `pgvector-semantic-search-audit.md` — análise técnica completa.
- `safe-vector-migration-strategy.md` — blueprint seguro (não implementado).
- `semantic-runtime-dependencies.md` — dependências de código.
- `vector-migration-hardening-report.md` — o que mudou no runner.
