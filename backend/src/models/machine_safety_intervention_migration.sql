-- ============================================================================
-- IMPETUS - PROTOCOLO IA DE CONTROLE E SEGURANÇA DE MÁQUINAS
-- Intervenção humana: bloqueio de automação, registro, liberação
-- Prioridade: 1) Segurança humana, 2) Integridade do equipamento, 3) Continuidade, 4) Automação
-- ============================================================================

-- 1. Intervenções humanas (técnico registrou que vai mexer no equipamento)
-- Enquanto ativa: NENHUMA automação pode ligar/comandar o equipamento
CREATE TABLE IF NOT EXISTS machine_human_interventions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  machine_identifier TEXT NOT NULL,
  machine_name TEXT,

  -- Quem registrou e qual tipo de intervenção
  registered_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  technician_name TEXT,
  intervention_type TEXT NOT NULL DEFAULT 'manutencao'
    CHECK (intervention_type IN ('manutencao', 'manutencao_mecanica', 'manutencao_eletrica', 'calibracao', 'inspecao', 'ajuste', 'outro')),

  -- Status: ACTIVE = automação bloqueada | RELEASED = equipamento liberado
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'released')),

  -- Horários
  registered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  released_at TIMESTAMPTZ,
  released_by UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Passos de segurança confirmados pelo técnico (opcional)
  safety_steps_confirmed BOOLEAN DEFAULT false,
  safety_confirmed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_machine_interventions_company ON machine_human_interventions(company_id);
CREATE INDEX IF NOT EXISTS idx_machine_interventions_machine ON machine_human_interventions(company_id, machine_identifier);
CREATE INDEX IF NOT EXISTS idx_machine_interventions_active ON machine_human_interventions(company_id, machine_identifier, status)
  WHERE status = 'active';

-- 2. Log quando automação é bloqueada por intervenção humana
CREATE TABLE IF NOT EXISTS machine_automation_block_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  machine_identifier TEXT NOT NULL,
  machine_name TEXT,
  intervention_id UUID REFERENCES machine_human_interventions(id) ON DELETE SET NULL,
  responsible_name TEXT,

  -- Motivo do bloqueio
  reason TEXT NOT NULL DEFAULT 'intervencao_humana',
  command_type TEXT,
  command_value TEXT,

  -- Contexto (ex: IA tentou ligar compressor por queda de pressão)
  context JSONB DEFAULT '{}',
  triggered_by TEXT CHECK (triggered_by IN ('user', 'automation', 'ia')),

  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_machine_block_log_company ON machine_automation_block_log(company_id);
CREATE INDEX IF NOT EXISTS idx_machine_block_log_created ON machine_automation_block_log(company_id, created_at DESC);
