-- APP IMPETUS OUTBOX
-- Mensagens para entrega via App Impetus (substitui Z-API para envio)
-- O App Impetus faz polling em GET /api/app-impetus/outbox

CREATE TABLE IF NOT EXISTS app_impetus_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Destinatário (telefone normalizado - App Impetus mapeia para usuário)
  recipient_phone TEXT NOT NULL,
  recipient_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Conteúdo
  message_type TEXT DEFAULT 'text',
  text_content TEXT NOT NULL,
  media_url TEXT,
  
  -- Origem (para rastreabilidade)
  originated_from TEXT, -- 'executive'|'tpm'|'org_ai'|'task'|'diagnostic'|'subscription'|'proactive'|'system'
  originated_from_communication_id UUID REFERENCES communications(id) ON DELETE SET NULL,
  
  -- Status de entrega
  status TEXT DEFAULT 'pending', -- pending, delivered, failed
  delivered_at TIMESTAMPTZ,
  error_message TEXT,
  
  -- Auditoria
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_app_impetus_outbox_company ON app_impetus_outbox(company_id);
CREATE INDEX IF NOT EXISTS idx_app_impetus_outbox_recipient ON app_impetus_outbox(recipient_phone);
CREATE INDEX IF NOT EXISTS idx_app_impetus_outbox_status ON app_impetus_outbox(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_app_impetus_outbox_created ON app_impetus_outbox(created_at DESC);

COMMENT ON TABLE app_impetus_outbox IS 'Mensagens para entrega via App Impetus - substitui Z-API';
