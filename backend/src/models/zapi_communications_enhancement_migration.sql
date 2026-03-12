-- ============================================================================
-- Z-API COMMUNICATIONS ENHANCEMENT
-- direction, conversation_thread_id, related_communication_id
-- Rastreamento bidirecional e LGPD
-- ============================================================================

-- Colunas para histórico bidirecional
ALTER TABLE communications ADD COLUMN IF NOT EXISTS direction TEXT DEFAULT 'inbound';
ALTER TABLE communications ADD COLUMN IF NOT EXISTS conversation_thread_id UUID;
ALTER TABLE communications ADD COLUMN IF NOT EXISTS related_communication_id UUID REFERENCES communications(id) ON DELETE SET NULL;

-- Índices
CREATE INDEX IF NOT EXISTS idx_communications_direction ON communications(direction) WHERE direction IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_communications_thread ON communications(conversation_thread_id) WHERE conversation_thread_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_communications_sender_phone ON communications(company_id, sender_phone) WHERE source = 'whatsapp';

-- Tabela para aviso LGPD no primeiro contato
CREATE TABLE IF NOT EXISTS whatsapp_first_contact (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  phone_normalized TEXT NOT NULL,
  notice_sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notice_version TEXT DEFAULT '1.0',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, phone_normalized)
);
CREATE INDEX IF NOT EXISTS idx_whatsapp_first_contact_company ON whatsapp_first_contact(company_id);

COMMENT ON TABLE whatsapp_first_contact IS 'Registro de aviso LGPD enviado no primeiro contato WhatsApp (Art. 9º LGPD)';
