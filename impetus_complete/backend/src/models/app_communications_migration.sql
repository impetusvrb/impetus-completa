-- Migration: App Impetus Communications (substituição Z-API)
-- Adiciona suporte a transcrição de mídia e source='app' em communications

-- Colunas para enriquecimento de relatórios (IA interpreta áudio/vídeo)
ALTER TABLE communications ADD COLUMN IF NOT EXISTS media_transcription TEXT;
ALTER TABLE communications ADD COLUMN IF NOT EXISTS media_interpretation JSONB;

COMMENT ON COLUMN communications.media_transcription IS 'Transcrição de áudio/vídeo via Whisper (OpenAI)';
COMMENT ON COLUMN communications.media_interpretation IS 'Interpretação estruturada pela IA (extraída de mídia)';

-- Garantir que source aceita 'app'
-- communications.source já é TEXT; valores atuais: whatsapp, web, system

-- Índice para consultas por source=app
CREATE INDEX IF NOT EXISTS idx_communications_source_app 
  ON communications(company_id, created_at DESC) 
  WHERE source = 'app';

-- Tabela de notificações push para usuários do app (substitui zapi_sent_messages para app)
CREATE TABLE IF NOT EXISTS app_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES users(id) ON DELETE CASCADE,
  communication_id UUID REFERENCES communications(id) ON DELETE SET NULL,
  message_type TEXT DEFAULT 'text',
  text_content TEXT NOT NULL,
  sent_via_socket BOOLEAN DEFAULT false,
  sent_at TIMESTAMPTZ DEFAULT now(),
  read_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_app_notifications_recipient ON app_notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_app_notifications_company ON app_notifications(company_id);
