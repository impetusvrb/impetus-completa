-- Index useful for pgvector similarity search on manual_chunks.embedding
CREATE INDEX IF NOT EXISTS idx_manual_chunks_embedding ON manual_chunks USING ivfflat (embedding) WITH (lists = 100);
