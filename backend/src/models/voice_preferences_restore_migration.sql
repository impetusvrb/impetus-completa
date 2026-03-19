-- Restaura voice_id e speed aos valores esperados pela aplicação
-- (a migração original usava onyx/1.0; a app espera nova/0.98)
-- Uso: npm run migrate (executa automaticamente)

-- 1. Amplia coluna speed para suportar 0.98 (DECIMAL(3,1) só permite uma casa decimal)
ALTER TABLE voice_preferences
  ALTER COLUMN speed TYPE DECIMAL(4,2);

-- 2. Atualiza registros com valores antigos incorretos (onyx, 1.0)
UPDATE voice_preferences
SET voice_id = 'nova', speed = 0.98, updated_at = NOW()
WHERE voice_id = 'onyx' OR speed = 1.0 OR speed IS NULL;

-- 3. Corrige os DEFAULT da tabela para futuros inserts
ALTER TABLE voice_preferences
  ALTER COLUMN voice_id SET DEFAULT 'nova';
ALTER TABLE voice_preferences
  ALTER COLUMN speed SET DEFAULT 0.98;
