-- ============================================================================
-- AI OUTBOUND AUDIT - Rastreabilidade de mensagens proativas da IA (LGPD)
-- Garante que toda mensagem enviada pela IA via WhatsApp seja auditável
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_outbound_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  recipient_user_id UUID REFERENCES users(id),
  recipient_phone TEXT NOT NULL,
  trigger_type TEXT NOT NULL,  -- 'reminder', 'alert', 'suggestion', 'failure_pattern', 'incomplete_event', etc
  message_preview TEXT,
  sent_at TIMESTAMPTZ,
  zapi_message_id TEXT,
  communication_id UUID REFERENCES communications(id),
  success BOOLEAN,
  error_message TEXT,
  lgpd_consent_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_outbound_audit_company ON ai_outbound_audit(company_id);
CREATE INDEX IF NOT EXISTS idx_ai_outbound_audit_recipient ON ai_outbound_audit(recipient_phone);
CREATE INDEX IF NOT EXISTS idx_ai_outbound_audit_created ON ai_outbound_audit(created_at DESC);

-- Opt-in para mensagens proativas (LGPD - consentimento explícito)
CREATE TABLE IF NOT EXISTS ai_proactive_consent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  granted BOOLEAN DEFAULT false,
  granted_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, company_id)
);

CREATE INDEX IF NOT EXISTS idx_ai_proactive_consent_company ON ai_proactive_consent(company_id);
