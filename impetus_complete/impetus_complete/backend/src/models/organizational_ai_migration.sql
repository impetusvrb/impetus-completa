-- ============================================================================
-- IA ORGANIZACIONAL ATIVA
-- Memória operacional, eventos estruturados, cobrança de informação
-- ============================================================================

CREATE TABLE IF NOT EXISTS operational_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  communication_id UUID,
  event_type TEXT NOT NULL,
  severity TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'open',
  machine_name TEXT,
  machine_code TEXT,
  part_code TEXT,
  part_name TEXT,
  sender_phone TEXT,
  sender_name TEXT,
  department TEXT,
  consumption_registered BOOLEAN DEFAULT false,
  production_stop BOOLEAN DEFAULT false,
  was_replaced BOOLEAN,
  metadata JSONB DEFAULT '{}',
  extracted_data JSONB DEFAULT '{}',
  escalation_sent_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_operational_events_company ON operational_events(company_id);
CREATE INDEX IF NOT EXISTS idx_operational_events_type ON operational_events(event_type);
CREATE INDEX IF NOT EXISTS idx_operational_events_status ON operational_events(status);
CREATE INDEX IF NOT EXISTS idx_operational_events_created ON operational_events(created_at);

CREATE TABLE IF NOT EXISTS ai_incomplete_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  communication_id UUID,
  operational_event_id UUID,
  sender_phone TEXT NOT NULL,
  pending_questions JSONB DEFAULT '[]',
  answered_questions JSONB DEFAULT '{}',
  last_reminder_at TIMESTAMPTZ,
  reminder_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_incomplete_sender ON ai_incomplete_events(sender_phone);
CREATE INDEX IF NOT EXISTS idx_ai_incomplete_status ON ai_incomplete_events(status);

CREATE TABLE IF NOT EXISTS ai_proactive_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL,
  message_text TEXT NOT NULL,
  target_phones TEXT[],
  target_group TEXT,
  sent_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS machine_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  machine_code TEXT,
  machine_name TEXT,
  event_type TEXT,
  part_code TEXT,
  part_name TEXT,
  quantity INTEGER DEFAULT 1,
  operational_event_id UUID,
  communication_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_machine_history_company ON machine_history(company_id);
CREATE INDEX IF NOT EXISTS idx_machine_history_machine ON machine_history(machine_code);
