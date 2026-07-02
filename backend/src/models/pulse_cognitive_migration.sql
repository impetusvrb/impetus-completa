-- ============================================================================
-- CERT-PULSE-02 — Pulse Cognitivo Organizacional (camada aditiva)
-- Ordem sugerida: impetus_pulse_migration.sql → operational_team_operator_gate → este ficheiro
-- ============================================================================

-- Fila de eventos humanos (ingestão silenciosa; não duplica dados operacionais)
CREATE TABLE IF NOT EXISTS pulse_cognitive_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  operational_team_member_id UUID REFERENCES operational_team_members(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  event_source TEXT NOT NULL DEFAULT 'platform',
  payload JSONB NOT NULL DEFAULT '{}',
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pce_company_created ON pulse_cognitive_events(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pce_company_unprocessed
  ON pulse_cognitive_events(company_id, created_at)
  WHERE processed_at IS NULL;

-- Índice vivo por colaborador (user OU membro operacional)
CREATE TABLE IF NOT EXISTS pulse_cognitive_index (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  operational_team_member_id UUID REFERENCES operational_team_members(id) ON DELETE CASCADE,
  pulse_index NUMERIC(5,2) NOT NULL DEFAULT 50,
  dimensions JSONB NOT NULL DEFAULT '{}',
  signals_snapshot JSONB NOT NULL DEFAULT '{}',
  correlations JSONB NOT NULL DEFAULT '[]',
  organizational_state TEXT,
  confidence NUMERIC(4,3) NOT NULL DEFAULT 0.5,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT pulse_cognitive_index_subject_check CHECK (
    (user_id IS NOT NULL AND operational_team_member_id IS NULL)
    OR (user_id IS NULL AND operational_team_member_id IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_pci_user ON pulse_cognitive_index(company_id, user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_pci_otm ON pulse_cognitive_index(company_id, operational_team_member_id)
  WHERE operational_team_member_id IS NOT NULL;

-- Histórico temporal do índice
CREATE TABLE IF NOT EXISTS pulse_cognitive_index_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  operational_team_member_id UUID REFERENCES operational_team_members(id) ON DELETE SET NULL,
  pulse_index NUMERIC(5,2) NOT NULL,
  dimensions JSONB NOT NULL DEFAULT '{}',
  organizational_state TEXT,
  confidence NUMERIC(4,3) NOT NULL DEFAULT 0.5,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pcih_company_recorded ON pulse_cognitive_index_history(company_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_pcih_user ON pulse_cognitive_index_history(user_id, recorded_at DESC) WHERE user_id IS NOT NULL;

-- Índices agregados (equipe, setor, turno, supervisor, departamento, empresa)
CREATE TABLE IF NOT EXISTS pulse_cognitive_aggregate_index (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  scope_type TEXT NOT NULL CHECK (scope_type IN (
    'team', 'sector', 'shift', 'supervisor', 'department', 'unit', 'company'
  )),
  scope_key TEXT NOT NULL,
  scope_label TEXT,
  pulse_index NUMERIC(5,2) NOT NULL DEFAULT 50,
  member_count INT NOT NULL DEFAULT 0,
  dimensions JSONB NOT NULL DEFAULT '{}',
  organizational_state TEXT,
  patterns JSONB NOT NULL DEFAULT '[]',
  confidence NUMERIC(4,3) NOT NULL DEFAULT 0.5,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, scope_type, scope_key)
);

CREATE INDEX IF NOT EXISTS idx_pcai_company_scope ON pulse_cognitive_aggregate_index(company_id, scope_type);

-- Estado organizacional inferido (nunca manual)
CREATE TABLE IF NOT EXISTS pulse_cognitive_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  scope_type TEXT NOT NULL,
  scope_key TEXT NOT NULL,
  scope_label TEXT,
  state_code TEXT NOT NULL,
  state_label TEXT NOT NULL,
  inference JSONB NOT NULL DEFAULT '{}',
  confidence NUMERIC(4,3) NOT NULL DEFAULT 0.5,
  evidence JSONB NOT NULL DEFAULT '[]',
  inferred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, scope_type, scope_key)
);

-- Padrões organizacionais detectados
CREATE TABLE IF NOT EXISTS pulse_cognitive_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  scope_type TEXT NOT NULL,
  scope_key TEXT NOT NULL,
  pattern_code TEXT NOT NULL,
  pattern_label TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'watch', 'elevated', 'critical')),
  signals JSONB NOT NULL DEFAULT '[]',
  correlations JSONB NOT NULL DEFAULT '[]',
  confidence NUMERIC(4,3) NOT NULL DEFAULT 0.5,
  assistive_only BOOLEAN NOT NULL DEFAULT true,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_pcp_company_detected ON pulse_cognitive_patterns(company_id, detected_at DESC);

-- Insights governados (human-in-the-loop)
CREATE TABLE IF NOT EXISTS pulse_cognitive_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  scope_type TEXT NOT NULL DEFAULT 'company',
  scope_key TEXT NOT NULL DEFAULT 'all',
  insight_type TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  indicators_used JSONB NOT NULL DEFAULT '[]',
  correlations JSONB NOT NULL DEFAULT '[]',
  evidence JSONB NOT NULL DEFAULT '[]',
  confidence NUMERIC(4,3) NOT NULL DEFAULT 0.5,
  assistive_only BOOLEAN NOT NULL DEFAULT true,
  human_in_the_loop BOOLEAN NOT NULL DEFAULT true,
  ai_generated BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pcins_company_created ON pulse_cognitive_insights(company_id, created_at DESC);

COMMENT ON TABLE pulse_cognitive_index IS 'CERT-PULSE-02: índice vivo contínuo; não substitui pulse_evaluations.';
COMMENT ON TABLE pulse_cognitive_events IS 'Eventos humanos para atualização silenciosa do Pulse Cognitivo.';
