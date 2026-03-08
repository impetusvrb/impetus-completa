-- ============================================================================
-- ADMIN STRUCTURAL BASE - Base Estrutural da Empresa para Impetus IA
-- Módulos: Dados Empresa, Cargos, Linhas, Ativos, Processos, Produtos,
--          Biblioteca (metadados), Indicadores, Falhas/Riscos, Regras Com,
--          Rotinas, Turnos, Responsáveis, Config IA
-- ============================================================================

-- ============================================================================
-- 1. DADOS DA EMPRESA (extensão da tabela companies)
-- ============================================================================

ALTER TABLE companies ADD COLUMN IF NOT EXISTS trade_name TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS subsegment TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS main_unit TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS other_units JSONB DEFAULT '[]';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS employee_count INTEGER;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS shift_count INTEGER;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS operating_hours TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS operation_type TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS production_type TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS products_manufactured TEXT[];
ALTER TABLE companies ADD COLUMN IF NOT EXISTS market TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS company_description TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS mission TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS vision TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS values_text TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS internal_policy TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS operation_rules TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS organizational_culture TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS strategic_notes TEXT;

-- ============================================================================
-- 2. CARGOS E ESTRUTURA HIERÁRQUICA
-- ============================================================================

CREATE TABLE IF NOT EXISTS company_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  description TEXT,
  hierarchy_level INTEGER,
  work_area TEXT,
  main_responsibilities TEXT[],
  critical_responsibilities TEXT[],
  recommended_permissions TEXT[],
  sectors_involved TEXT[],
  leadership_type TEXT,
  communication_profile TEXT,
  direct_superior_role_id UUID REFERENCES company_roles(id) ON DELETE SET NULL,
  expected_subordinates TEXT[],
  decision_level TEXT,
  visible_themes TEXT[],
  hidden_themes TEXT[],
  escalation_role TEXT,
  operation_role TEXT,
  approval_role TEXT,
  notes TEXT,
  
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_company_roles_company ON company_roles(company_id);
CREATE INDEX idx_company_roles_hierarchy ON company_roles(company_id, hierarchy_level);

-- ============================================================================
-- 3. LINHAS DE PRODUÇÃO
-- ============================================================================

CREATE TABLE IF NOT EXISTS production_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  code TEXT,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  unit_plant TEXT,
  main_product_id UUID,
  process_type TEXT,
  productive_capacity TEXT,
  status TEXT DEFAULT 'active',
  responsible_id UUID REFERENCES users(id) ON DELETE SET NULL,
  description TEXT,
  main_bottleneck TEXT,
  critical_point TEXT,
  operation_time TEXT,
  shift_ids UUID[],
  criticality_level TEXT,
  operational_notes TEXT,
  
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_production_lines_company ON production_lines(company_id);
CREATE INDEX idx_production_lines_department ON production_lines(department_id);

-- Máquinas da linha (seção dentro da linha)
CREATE TABLE IF NOT EXISTS production_line_machines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  line_id UUID NOT NULL REFERENCES production_lines(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  nickname TEXT,
  code_tag TEXT,
  function_in_process TEXT,
  machine_type TEXT,
  manufacturer TEXT,
  model TEXT,
  serial_number TEXT,
  year INTEGER,
  status TEXT DEFAULT 'active',
  criticality TEXT,
  flow_order INTEGER,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  common_failures TEXT[],
  downtime_impact TEXT,
  technical_notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_line_machines_line ON production_line_machines(line_id);

-- ============================================================================
-- 5. PROCESSOS DA EMPRESA (criado antes de assets para FK process_id)
-- ============================================================================

CREATE TABLE IF NOT EXISTS company_processes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  category TEXT,
  objective TEXT,
  responsible_area_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  involved_sectors TEXT[],
  process_steps JSONB,
  process_inputs TEXT[],
  process_outputs TEXT[],
  responsibles TEXT[],
  process_indicators TEXT[],
  process_risks TEXT[],
  critical_points TEXT[],
  frequency TEXT,
  related_procedures TEXT[],
  related_machines UUID[],
  related_lines UUID[],
  related_products UUID[],
  dependencies TEXT[],
  notes TEXT,
  
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_company_processes_company ON company_processes(company_id);

-- ============================================================================
-- 4. MÁQUINAS, ATIVOS E EQUIPAMENTOS (visão geral)
-- ============================================================================

CREATE TABLE IF NOT EXISTS assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  code_patrimonial TEXT,
  operational_nickname TEXT,
  asset_category TEXT,
  equipment_type TEXT,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  line_id UUID REFERENCES production_lines(id) ON DELETE SET NULL,
  process_id UUID,
  manufacturer TEXT,
  model TEXT,
  serial_number TEXT,
  year INTEGER,
  installation_date DATE,
  current_state TEXT,
  operational_status TEXT DEFAULT 'active',
  criticality TEXT,
  main_components TEXT[],
  power_source TEXT,
  recurrent_failures TEXT[],
  frequent_symptoms TEXT[],
  associated_risks TEXT[],
  downtime_impact TEXT,
  related_preventive_plan TEXT,
  related_manuals UUID[],
  related_pops UUID[],
  technical_responsible_id UUID REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT,
  
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_assets_company ON assets(company_id);
CREATE INDEX idx_assets_line ON assets(line_id);
CREATE INDEX idx_assets_department ON assets(department_id);

-- FK em assets para process_id
ALTER TABLE assets DROP CONSTRAINT IF EXISTS fk_assets_process;
ALTER TABLE assets ADD CONSTRAINT fk_assets_process FOREIGN KEY (process_id) REFERENCES company_processes(id) ON DELETE SET NULL;

-- ============================================================================
-- 6. PRODUTOS
-- ============================================================================

CREATE TABLE IF NOT EXISTS company_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  code TEXT,
  category TEXT,
  description TEXT,
  line_id UUID REFERENCES production_lines(id) ON DELETE SET NULL,
  main_department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  process_id UUID REFERENCES company_processes(id) ON DELETE SET NULL,
  packaging TEXT,
  quality_standards TEXT[],
  critical_requirements TEXT[],
  important_specs TEXT[],
  associated_risks TEXT[],
  avg_production_time TEXT,
  main_machines_used UUID[],
  related_procedures TEXT[],
  related_pops UUID[],
  technical_notes TEXT,
  
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_company_products_company ON company_products(company_id);
CREATE INDEX idx_company_products_line ON company_products(line_id);

-- FK main_product_id em production_lines
ALTER TABLE production_lines DROP CONSTRAINT IF EXISTS fk_lines_main_product;
ALTER TABLE production_lines ADD CONSTRAINT fk_lines_main_product FOREIGN KEY (main_product_id) REFERENCES company_products(id) ON DELETE SET NULL;

-- ============================================================================
-- 7. BIBLIOTECA - Metadados estendidos (manuals e pops já existem)
-- ============================================================================

ALTER TABLE manuals ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE manuals ADD COLUMN IF NOT EXISTS summary_description TEXT;
ALTER TABLE manuals ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(id) ON DELETE SET NULL;
ALTER TABLE manuals ADD COLUMN IF NOT EXISTS line_id UUID REFERENCES production_lines(id) ON DELETE SET NULL;
ALTER TABLE manuals ADD COLUMN IF NOT EXISTS asset_id UUID REFERENCES assets(id) ON DELETE SET NULL;
ALTER TABLE manuals ADD COLUMN IF NOT EXISTS process_id UUID REFERENCES company_processes(id) ON DELETE SET NULL;
ALTER TABLE manuals ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES company_products(id) ON DELETE SET NULL;
ALTER TABLE manuals ADD COLUMN IF NOT EXISTS version TEXT;
ALTER TABLE manuals ADD COLUMN IF NOT EXISTS expiry_date DATE;
ALTER TABLE manuals ADD COLUMN IF NOT EXISTS responsible_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE manuals ADD COLUMN IF NOT EXISTS keywords TEXT[];
ALTER TABLE manuals ADD COLUMN IF NOT EXISTS confidentiality_level TEXT;
ALTER TABLE manuals ADD COLUMN IF NOT EXISTS allowed_audience TEXT[];
ALTER TABLE manuals ADD COLUMN IF NOT EXISTS document_notes TEXT;

-- Pops: adicionar campos de contexto se não existirem
ALTER TABLE pops ADD COLUMN IF NOT EXISTS line_id UUID REFERENCES production_lines(id) ON DELETE SET NULL;
ALTER TABLE pops ADD COLUMN IF NOT EXISTS asset_id UUID REFERENCES assets(id) ON DELETE SET NULL;
ALTER TABLE pops ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES company_products(id) ON DELETE SET NULL;

-- Tabela unificada para documentos da biblioteca (POPs, manuais, etc.)
-- Permite cadastro estruturado com metadados para IA
CREATE TABLE IF NOT EXISTS knowledge_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  title TEXT NOT NULL,
  category TEXT,
  doc_type TEXT,
  summary_description TEXT,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  line_id UUID REFERENCES production_lines(id) ON DELETE SET NULL,
  asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,
  process_id UUID REFERENCES company_processes(id) ON DELETE SET NULL,
  product_id UUID REFERENCES company_products(id) ON DELETE SET NULL,
  version TEXT,
  expiry_date DATE,
  responsible_id UUID REFERENCES users(id) ON DELETE SET NULL,
  keywords TEXT[],
  confidentiality_level TEXT,
  allowed_audience TEXT[],
  document_url TEXT,
  notes TEXT,
  manual_id UUID REFERENCES manuals(id) ON DELETE SET NULL,
  pop_id UUID REFERENCES pops(id) ON DELETE SET NULL,
  
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_knowledge_docs_company ON knowledge_documents(company_id);
CREATE INDEX idx_knowledge_docs_category ON knowledge_documents(company_id, category);

-- ============================================================================
-- 8. METAS E INDICADORES
-- ============================================================================

CREATE TABLE IF NOT EXISTS kpi_indicators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  indicator_type TEXT,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  line_id UUID REFERENCES production_lines(id) ON DELETE SET NULL,
  process_id UUID REFERENCES company_processes(id) ON DELETE SET NULL,
  target_value TEXT,
  min_acceptable NUMERIC,
  max_acceptable NUMERIC,
  attention_range TEXT,
  critical_range TEXT,
  measurement_frequency TEXT,
  unit TEXT,
  responsible_id UUID REFERENCES users(id) ON DELETE SET NULL,
  deviation_action TEXT,
  strategic_weight INTEGER,
  notes TEXT,
  
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_kpi_indicators_company ON kpi_indicators(company_id);

-- ============================================================================
-- 9. FALHAS, RISCOS E EVENTOS CRÍTICOS
-- ============================================================================

CREATE TABLE IF NOT EXISTS failure_risks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  failure_type TEXT,
  risk_category TEXT,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  line_id UUID REFERENCES production_lines(id) ON DELETE SET NULL,
  asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,
  process_id UUID REFERENCES company_processes(id) ON DELETE SET NULL,
  possible_causes TEXT[],
  common_symptoms TEXT[],
  operational_impact TEXT,
  quality_impact TEXT,
  safety_impact TEXT,
  productivity_impact TEXT,
  criticality_level TEXT,
  expected_frequency TEXT,
  default_response_plan TEXT,
  default_responsible_id UUID REFERENCES users(id) ON DELETE SET NULL,
  suggested_escalation TEXT,
  notes TEXT,
  
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_failure_risks_company ON failure_risks(company_id);
CREATE INDEX idx_failure_risks_asset ON failure_risks(asset_id);

-- ============================================================================
-- 10. REGRAS DE COMUNICAÇÃO E ESCALONAMENTO
-- ============================================================================

CREATE TABLE IF NOT EXISTS communication_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  subject_type TEXT NOT NULL,
  priority_level TEXT,
  profile_can_view TEXT[],
  profile_must_notify TEXT[],
  profile_must_approve TEXT[],
  profile_must_act TEXT[],
  notification_hours TEXT,
  preferred_channel TEXT,
  escalation_rules JSONB,
  max_response_time TEXT,
  max_resolution_time TEXT,
  confidentiality_level TEXT,
  sensitive_topic BOOLEAN DEFAULT false,
  language_by_profile JSONB,
  communication_flow TEXT,
  notes TEXT,
  
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_communication_rules_company ON communication_rules(company_id);

-- ============================================================================
-- 11. ROTINAS, CHECKLISTS E INSPEÇÕES
-- ============================================================================

CREATE TABLE IF NOT EXISTS checklist_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  description TEXT,
  items JSONB,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_checklist_templates_company ON checklist_templates(company_id);

CREATE TABLE IF NOT EXISTS routines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  routine_type TEXT,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  line_id UUID REFERENCES production_lines(id) ON DELETE SET NULL,
  asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,
  frequency TEXT,
  expected_time TEXT,
  responsible_id UUID REFERENCES users(id) ON DELETE SET NULL,
  checklist_id UUID REFERENCES checklist_templates(id) ON DELETE SET NULL,
  verification_items JSONB,
  conformity_criteria TEXT[],
  related_procedures TEXT[],
  non_conformity_action TEXT,
  notes TEXT,
  
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_routines_company ON routines(company_id);

-- ============================================================================
-- 12. TURNOS, JORNADAS E ESTRUTURA OPERACIONAL
-- ============================================================================

CREATE TABLE IF NOT EXISTS shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  start_time TIME,
  end_time TIME,
  active_departments UUID[],
  active_lines UUID[],
  main_teams TEXT[],
  shift_responsibles UUID[],
  shift_leader_id UUID REFERENCES users(id) ON DELETE SET NULL,
  operational_notes TEXT,
  shift_routines TEXT[],
  common_risks TEXT[],
  special_rules TEXT,
  
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_shifts_company ON shifts(company_id);

-- ============================================================================
-- 13. RESPONSÁVEIS TÉCNICOS E DONOS DE ÁREA
-- ============================================================================

CREATE TABLE IF NOT EXISTS area_responsibles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  area_name TEXT NOT NULL,
  area_type TEXT,
  main_responsible_id UUID REFERENCES users(id) ON DELETE SET NULL,
  substitute_responsible_id UUID REFERENCES users(id) ON DELETE SET NULL,
  supervisor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  manager_id UUID REFERENCES users(id) ON DELETE SET NULL,
  director_id UUID REFERENCES users(id) ON DELETE SET NULL,
  responsible_themes TEXT[],
  responsible_assets UUID[],
  responsible_lines UUID[],
  responsible_processes UUID[],
  contact_rules TEXT,
  notes TEXT,
  
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_area_responsibles_company ON area_responsibles(company_id);

-- ============================================================================
-- 14. CONFIGURAÇÕES DE INTELIGÊNCIA PARA A IA
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_intelligence_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  config_key TEXT NOT NULL,
  config_type TEXT,
  internal_terms TEXT[],
  machine_nicknames JSONB,
  internal_acronyms TEXT[],
  critical_words TEXT[],
  sensitive_words TEXT[],
  confidential_themes TEXT[],
  priority_themes TEXT[],
  forbidden_per_profile JSONB,
  response_rules_per_profile JSONB,
  language_preference TEXT,
  auto_alert_rules JSONB,
  monitoring_triggers JSONB,
  escalation_contexts TEXT[],
  discrete_response_contexts TEXT[],
  immediate_response_contexts TEXT[],
  notes TEXT,
  
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, config_key)
);

CREATE INDEX idx_ai_intelligence_config_company ON ai_intelligence_config(company_id);
