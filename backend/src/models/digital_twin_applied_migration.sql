-- =========================================================
-- GÊMEO DIGITAL APLICADO — Tabelas
-- Módulo desacoplado: consome manuia_machines, manuia_sensors, work_orders
-- =========================================================

CREATE TABLE IF NOT EXISTS digital_twin_diagnostics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  machine_id UUID REFERENCES manuia_machines(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  session_id UUID REFERENCES manuia_sessions(id) ON DELETE SET NULL,

  trigger_source TEXT DEFAULT 'manual'
    CHECK (trigger_source IN ('manual', 'sensor', 'plc', 'event', 'anomaly', 'scheduled')),
  trigger_data JSONB DEFAULT '{}',

  -- Diagnóstico Gemini
  diagnosis JSONB DEFAULT '{}',
  -- { cause, component, criticality, risk, impact, action, confidence, gemini_model }

  -- Representação visual
  visual_type TEXT DEFAULT 'ai_generated'
    CHECK (visual_type IN ('technical_drawing', 'photo', 'catalog', 'ai_generated')),
  visual_prompt TEXT,
  visual_description TEXT,
  visual_url TEXT,

  -- Procedimento de manutenção
  maintenance_procedure JSONB DEFAULT '{}',
  -- { root_cause, action_plan, checklist, tools, spare_parts, disassembly, assembly, loto, post_test, validation }

  -- Trend analysis snapshot
  trend_snapshot JSONB DEFAULT '{}',
  -- { temperature, vibration, current, pressure, predictions }

  -- Status
  status TEXT DEFAULT 'active'
    CHECK (status IN ('active', 'resolved', 'escalated', 'archived')),
  criticality TEXT DEFAULT 'low'
    CHECK (criticality IN ('normal', 'low', 'medium', 'high', 'critical')),

  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dtd_company ON digital_twin_diagnostics(company_id);
CREATE INDEX IF NOT EXISTS idx_dtd_machine ON digital_twin_diagnostics(machine_id);
CREATE INDEX IF NOT EXISTS idx_dtd_status ON digital_twin_diagnostics(status);
CREATE INDEX IF NOT EXISTS idx_dtd_created ON digital_twin_diagnostics(created_at DESC);

-- Memória industrial — aprendizado contínuo
CREATE TABLE IF NOT EXISTS digital_twin_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  machine_id UUID REFERENCES manuia_machines(id) ON DELETE SET NULL,
  diagnostic_id UUID REFERENCES digital_twin_diagnostics(id) ON DELETE SET NULL,

  failure_type TEXT NOT NULL,
  component TEXT NOT NULL,
  sensor_signature JSONB DEFAULT '{}',
  root_cause TEXT,
  solution_applied TEXT,
  repair_time_minutes INT,
  effectiveness TEXT DEFAULT 'unknown'
    CHECK (effectiveness IN ('effective', 'partial', 'ineffective', 'unknown')),

  embedding_vector FLOAT8[],
  tags TEXT[] DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dtm_company ON digital_twin_memory(company_id);
CREATE INDEX IF NOT EXISTS idx_dtm_machine ON digital_twin_memory(machine_id);
CREATE INDEX IF NOT EXISTS idx_dtm_failure ON digital_twin_memory(failure_type);

-- Assets visuais gerados (cache de imagens/diagramas gerados por IA)
CREATE TABLE IF NOT EXISTS digital_twin_visual_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  diagnostic_id UUID REFERENCES digital_twin_diagnostics(id) ON DELETE CASCADE,

  asset_type TEXT NOT NULL
    CHECK (asset_type IN ('exploded_view', 'cross_section', 'isometric', 'highlight', 'comparison', 'diagram', 'trend_chart')),
  description TEXT,
  prompt_used TEXT,
  content_text TEXT,
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dtva_diagnostic ON digital_twin_visual_assets(diagnostic_id);
