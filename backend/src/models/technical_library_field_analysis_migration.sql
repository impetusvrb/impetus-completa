-- Análise de campo (foto/vídeo) — Biblioteca Técnica Inteligente / ManuIA
-- Multi-tenant: company_id em todas as linhas

CREATE TABLE IF NOT EXISTS technical_library_field_analyses (
  id UUID PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  machine_label TEXT,
  sector TEXT,
  maintenance_type TEXT,
  urgency TEXT,
  observation TEXT,
  media_paths JSONB NOT NULL DEFAULT '[]',
  video_path TEXT,
  extracted_frame_paths JSONB DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  ai_result JSONB DEFAULT '{}',
  unity_payload JSONB DEFAULT '{}',
  fallback_level INT NOT NULL DEFAULT 4,
  matched_equipment_id UUID REFERENCES technical_library_equipments(id) ON DELETE SET NULL,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tlfa_company ON technical_library_field_analyses(company_id);
CREATE INDEX IF NOT EXISTS idx_tlfa_company_created ON technical_library_field_analyses(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tlfa_user ON technical_library_field_analyses(user_id);
