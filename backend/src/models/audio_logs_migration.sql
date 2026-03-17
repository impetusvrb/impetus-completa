-- ============================================================================
-- IMPETUS - LOGS DE ÁUDIO (SENSÍVEL)
-- Armazena transcrições e referências a áudios para acesso exclusivo da IA
-- Apenas CEO e diretoria podem solicitar o conteúdo via IA (auditoria)
-- ============================================================================

CREATE TABLE IF NOT EXISTS audio_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  source VARCHAR(32) NOT NULL, -- 'app_communication', 'internal_chat', 'cadastrar_ia', 'communications', 'chat_multimodal'
  source_id UUID, -- communication_id, message_id, etc.
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  sender_name TEXT,
  media_url TEXT NOT NULL,
  transcription TEXT,
  message_type VARCHAR(16) DEFAULT 'audio', -- audio, video
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audio_logs_company ON audio_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_audio_logs_created ON audio_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audio_logs_source ON audio_logs(source, source_id);
