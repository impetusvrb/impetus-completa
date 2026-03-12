-- Registro Inteligente: registros assistidos por IA
-- Tabela para armazenar relatos processados com categorização automática
CREATE TABLE IF NOT EXISTS intelligent_registrations (
  id SERIAL PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  original_text TEXT NOT NULL,
  ai_summary TEXT,
  main_category VARCHAR(80) DEFAULT 'rotina',
  subcategories JSONB DEFAULT '[]',
  priority VARCHAR(30) DEFAULT 'normal',
  needs_followup BOOLEAN DEFAULT FALSE,
  needs_escalation BOOLEAN DEFAULT FALSE,
  sector_identified VARCHAR(120),
  department_identified VARCHAR(120),
  line_identified VARCHAR(120),
  machine_identified VARCHAR(120),
  process_identified VARCHAR(120),
  product_identified VARCHAR(120),
  activities_detected JSONB DEFAULT '[]',
  problems_detected JSONB DEFAULT '[]',
  pendencies_detected JSONB DEFAULT '[]',
  suggestions_detected JSONB DEFAULT '[]',
  shift_name VARCHAR(80),
  registration_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_intelligent_registrations_company ON intelligent_registrations(company_id);
CREATE INDEX IF NOT EXISTS idx_intelligent_registrations_user ON intelligent_registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_intelligent_registrations_date ON intelligent_registrations(registration_date);
CREATE INDEX IF NOT EXISTS idx_intelligent_registrations_priority ON intelligent_registrations(priority);
CREATE INDEX IF NOT EXISTS idx_intelligent_registrations_category ON intelligent_registrations(main_category);
