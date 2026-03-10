-- Migration: Suporte a contexto de documentos para IA
-- Garante colunas necessárias para manuals, pops e companies
-- Executar após o schema base

-- Manuais: adicionar colunas se não existirem (compatível com admin settings)
ALTER TABLE manuals ADD COLUMN IF NOT EXISTS company_id UUID;
ALTER TABLE manuals ADD COLUMN IF NOT EXISTS equipment_type TEXT;
ALTER TABLE manuals ADD COLUMN IF NOT EXISTS model TEXT;
ALTER TABLE manuals ADD COLUMN IF NOT EXISTS manufacturer TEXT;
ALTER TABLE manuals ADD COLUMN IF NOT EXISTS file_url TEXT;
ALTER TABLE manuals ADD COLUMN IF NOT EXISTS uploaded_by UUID;
ALTER TABLE manuals ADD COLUMN IF NOT EXISTS embedding_processed BOOLEAN DEFAULT false;
ALTER TABLE manuals ADD COLUMN IF NOT EXISTS content_text TEXT;
ALTER TABLE manuals ADD COLUMN IF NOT EXISTS title TEXT;
-- manual_type: 'operacional' | 'maquina' - separação Manual Operacional vs Manual de Máquina
ALTER TABLE manuals ADD COLUMN IF NOT EXISTS manual_type TEXT DEFAULT 'maquina';
-- Colunas usadas pelo admin/settings
ALTER TABLE manuals ADD COLUMN IF NOT EXISTS upload_date TIMESTAMPTZ;
ALTER TABLE manuals ADD COLUMN IF NOT EXISTS embedding_status TEXT;
UPDATE manuals SET upload_date = created_at WHERE upload_date IS NULL AND created_at IS NOT NULL;

-- POPs: garantir colunas usadas pelo documentContext
ALTER TABLE pops ADD COLUMN IF NOT EXISTS company_id UUID;
ALTER TABLE pops ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE pops ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE pops ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE pops ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;
