-- Ativa busca semântica em manual_chunks
-- Extensão vector já deve estar instalada: CREATE EXTENSION vector;
-- Dimensões: text-embedding-3-small = 1536

-- 1. Garantir extensão
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Converter coluna embedding: TEXT -> vector(1536)
-- Como manual_chunks pode estar vazia, fazemos DROP/ADD para simplificar
ALTER TABLE manual_chunks DROP COLUMN IF EXISTS embedding;
ALTER TABLE manual_chunks ADD COLUMN embedding vector(1536);

-- 3. Índice ivfflat para busca por similaridade (<=> usa cosine)
-- lists=100 adequado para até ~10k chunks; ajustar após ter dados
CREATE INDEX IF NOT EXISTS idx_manual_chunks_embedding 
  ON manual_chunks USING ivfflat (embedding vector_cosine_ops) 
  WITH (lists = 100);
