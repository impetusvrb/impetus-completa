-- ============================================================================
-- MIGRAÇÃO TPM - Formulário de Perdas e Manutenções no Pró-Ação
-- Campos: data, hora, equipamento/componente, manutentor, causa raiz, perdas, etc.
-- ============================================================================

-- Incidentes TPM (uma linha por falha/ocorrência)
CREATE TABLE IF NOT EXISTS tpm_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  communication_id UUID REFERENCES communications(id) ON DELETE SET NULL,
  source_message_id TEXT,
  operator_phone TEXT,
  incident_date DATE,
  incident_time TIME,
  equipment_code TEXT,
  component_name TEXT,
  maintainer_name TEXT,
  root_cause TEXT,
  frequency_observation TEXT,
  failing_part TEXT,
  corrective_action TEXT,
  losses_before INTEGER DEFAULT 0,
  losses_during INTEGER DEFAULT 0,
  losses_after INTEGER DEFAULT 0,
  operator_name TEXT,
  observation TEXT,
  shift_number INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  filled_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tpm_incidents_company ON tpm_incidents(company_id);
CREATE INDEX IF NOT EXISTS idx_tpm_incidents_date ON tpm_incidents(incident_date DESC);
CREATE INDEX IF NOT EXISTS idx_tpm_incidents_equipment ON tpm_incidents(equipment_code);

-- Perdas por turno (agregação)
CREATE TABLE IF NOT EXISTS tpm_shift_totals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  shift_date DATE NOT NULL,
  shift_number INTEGER NOT NULL,
  total_losses INTEGER DEFAULT 0,
  incident_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, shift_date, shift_number)
);

CREATE INDEX IF NOT EXISTS idx_tpm_shift_company_date ON tpm_shift_totals(company_id, shift_date);

-- Sessões de preenchimento conversacional (estado da conversa via WhatsApp)
CREATE TABLE IF NOT EXISTS tpm_form_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  operator_phone TEXT NOT NULL,
  communication_id UUID REFERENCES communications(id) ON DELETE SET NULL,
  incident_id UUID REFERENCES tpm_incidents(id) ON DELETE SET NULL,
  current_step TEXT DEFAULT 'date',
  collected_data JSONB DEFAULT '{}',
  status TEXT DEFAULT 'in_progress',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tpm_sessions_phone ON tpm_form_sessions(operator_phone);
CREATE INDEX IF NOT EXISTS idx_tpm_sessions_company ON tpm_form_sessions(company_id);
CREATE INDEX IF NOT EXISTS idx_tpm_sessions_status ON tpm_form_sessions(status);
