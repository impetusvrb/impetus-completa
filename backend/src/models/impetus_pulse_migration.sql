-- ============================================================================
-- IMPETUS PULSE — Autoavaliação, hierarquia blind e analytics (Indústria 4.0)
-- ============================================================================

CREATE TABLE IF NOT EXISTS pulse_company_settings (
  company_id UUID PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,
  pulse_enabled BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pulse_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title TEXT,
  frequency TEXT NOT NULL DEFAULT 'monthly'
    CHECK (frequency IN ('weekly', 'monthly', 'quarterly', 'annual')),
  target_roles TEXT[] NOT NULL DEFAULT ARRAY['operador', 'colaborador', 'auxiliar', 'auxiliar_producao', 'supervisor', 'coordenador', 'gerente'],
  is_active BOOLEAN NOT NULL DEFAULT true,
  next_run_at TIMESTAMPTZ,
  last_run_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pulse_campaigns_company ON pulse_campaigns(company_id);

CREATE TABLE IF NOT EXISTS pulse_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  supervisor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  campaign_id UUID REFERENCES pulse_campaigns(id) ON DELETE SET NULL,
  fixed_scores JSONB NOT NULL DEFAULT '{}',
  ai_custom_questions JSONB NOT NULL DEFAULT '[]',
  ai_operational_snapshot JSONB NOT NULL DEFAULT '{}',
  ai_feedback_message TEXT,
  ai_diagnostic_report JSONB,
  supervisor_perception TEXT,
  status TEXT NOT NULL DEFAULT 'pending_user'
    CHECK (status IN ('pending_user', 'pending_supervisor', 'completed')),
  scheduled_for TIMESTAMPTZ NOT NULL DEFAULT now(),
  self_completed_at TIMESTAMPTZ,
  supervisor_completed_at TIMESTAMPTZ,
  motivation_pill TEXT,
  motivation_pill_for_week DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pulse_eval_company_user ON pulse_evaluations(company_id, user_id);
CREATE INDEX IF NOT EXISTS idx_pulse_eval_status ON pulse_evaluations(company_id, status);
CREATE INDEX IF NOT EXISTS idx_pulse_eval_supervisor_pending
  ON pulse_evaluations(supervisor_id, status)
  WHERE status = 'pending_supervisor';
CREATE INDEX IF NOT EXISTS idx_pulse_eval_user_status ON pulse_evaluations(user_id, status);

COMMENT ON TABLE pulse_evaluations IS 'Pulse: autoavaliação + snapshot IA; supervisor não acessa fixed_scores via API de gestão.';
