-- =============================================================================
-- SAFE VECTOR MIGRATION TEMPLATE — IMPETUS Semantic Memory Governance
-- =============================================================================
-- Este ficheiro NÃO é uma migration executável. É um template para criar
-- novas evoluções vetoriais de forma segura e auditável.
--
-- REGRAS INVIOLÁVEIS:
--   1. NUNCA usar DROP COLUMN embedding
--   2. NUNCA usar ALTER COLUMN embedding TYPE (mudança dimensional destrutiva)
--   3. NUNCA usar TRUNCATE manual_chunks
--   4. NUNCA reconstruir índice sem CONCURRENTLY
--   5. SEMPRE incluir rollback path
--   6. SEMPRE validar antes de ativar
--
-- PADRÃO DE FASES:
--   Phase 1: PREPARE    — criar novas estruturas (additive)
--   Phase 2: DUAL-WRITE — coexistência de colunas/índices
--   Phase 3: VALIDATE   — comparar qualidade / dimensão
--   Phase 4: ROLLOUT    — ativar novo como primário
--   Phase 5: CLEANUP    — remover antigo (OPCIONAL, SEPARADO)
-- =============================================================================

-- ┌─────────────────────────────────────────────────────────────────────────┐
-- │ Phase 1: PREPARE — Adicionar nova coluna shadow (ADDITIVE, SEGURO)    │
-- └─────────────────────────────────────────────────────────────────────────┘

-- Exemplo: migrar de text-embedding-3-small (1536d) para futuro modelo (3072d)
-- ALTER TABLE manual_chunks ADD COLUMN IF NOT EXISTS embedding_v2 vector(3072);

-- Criar índice CONCURRENTLY (não bloqueia leituras/escritas)
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_manual_chunks_embedding_v2
--   ON manual_chunks USING ivfflat (embedding_v2 vector_cosine_ops)
--   WITH (lists = 100);

-- ┌─────────────────────────────────────────────────────────────────────────┐
-- │ Phase 2: DUAL-WRITE — vectorRuntimeService escreve em ambas colunas   │
-- │ (controlado por feature flag no runtime, não por SQL)                  │
-- └─────────────────────────────────────────────────────────────────────────┘

-- Nesta fase NÃO há SQL. O runtime faz INSERT/UPDATE em ambas colunas.

-- ┌─────────────────────────────────────────────────────────────────────────┐
-- │ Phase 3: VALIDATE — Verificar cobertura e qualidade                   │
-- └─────────────────────────────────────────────────────────────────────────┘

-- SELECT
--   count(*) AS total,
--   count(embedding) AS v1_count,
--   count(embedding_v2) AS v2_count,
--   count(*) FILTER (WHERE embedding IS NOT NULL AND embedding_v2 IS NOT NULL) AS both_count
-- FROM manual_chunks;

-- ┌─────────────────────────────────────────────────────────────────────────┐
-- │ Phase 4: ROLLOUT — Runtime muda para ler da coluna nova               │
-- │ (controlado por VECTOR_SCHEMA_REGISTRY no runtime, não por SQL)       │
-- └─────────────────────────────────────────────────────────────────────────┘

-- ┌─────────────────────────────────────────────────────────────────────────┐
-- │ Phase 5: CLEANUP — OPCIONAL, SEPARADO, NUNCA AUTOMÁTICO               │
-- │ Só executar MANUALMENTE após validação completa do rollout.           │
-- │ NUNCA incluir no runner automático.                                    │
-- └─────────────────────────────────────────────────────────────────────────┘

-- CLEANUP MANUAL (NUNCA executar automaticamente):
-- ALTER TABLE manual_chunks DROP COLUMN IF EXISTS embedding;
-- ALTER TABLE manual_chunks RENAME COLUMN embedding_v2 TO embedding;

-- ROLLBACK (se fase 4 falhar):
-- O runtime reverte para VECTOR_SCHEMA_REGISTRY.primary.column = 'embedding'
-- A coluna shadow (embedding_v2) permanece intacta para retry.

SELECT 'safe_vector_migration_template — este ficheiro é apenas um template, não executa nada.' AS info;
