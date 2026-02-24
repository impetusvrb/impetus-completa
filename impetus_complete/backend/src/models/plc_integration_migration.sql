-- Integração PLC + IA de Coleta (IA 2)
CREATE TABLE IF NOT EXISTS plc_collected_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  equipment_id TEXT NOT NULL,
  equipment_name TEXT,
  temperature NUMERIC(8,2),
  pressure NUMERIC(8,2),
  vibration NUMERIC(8,2),
  status TEXT,
  rpm NUMERIC(10,2),
  power_kw NUMERIC(10,2),
  raw_data JSONB,
  collected_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_plc_data_company ON plc_collected_data(company_id);
CREATE INDEX IF NOT EXISTS idx_plc_data_equipment ON plc_collected_data(equipment_id);

CREATE TABLE IF NOT EXISTS plc_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  equipment_id TEXT NOT NULL,
  equipment_name TEXT,
  collected_data_id UUID,
  variation_type TEXT,
  variation_description TEXT,
  severity TEXT DEFAULT 'medium',
  possible_causes JSONB NOT NULL DEFAULT '[]',
  manual_ids_consulted UUID[],
  analysis_raw TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_plc_analysis_company ON plc_analysis(company_id);

CREATE TABLE IF NOT EXISTS plc_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  analysis_id UUID,
  equipment_id TEXT NOT NULL,
  equipment_name TEXT,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  severity TEXT DEFAULT 'medium',
  possible_causes JSONB,
  acknowledged BOOLEAN DEFAULT false,
  acknowledged_by UUID,
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_plc_alerts_company ON plc_alerts(company_id);
CREATE INDEX IF NOT EXISTS idx_plc_alerts_ack ON plc_alerts(acknowledged);
