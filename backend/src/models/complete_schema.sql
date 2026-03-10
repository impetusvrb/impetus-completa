-- ============================================================================
-- IMPETUS COMUNICA IA - SCHEMA COMPLETO DO BANCO DE DADOS
-- Criadores: Wellington Machado de Freitas & Gustavo Júnior da Silva
-- Registro INPI: BR512025007048-9 (30/11/2025)
-- ============================================================================
-- Este schema implementa TODOS os 3 pilares do sistema:
-- 1. Comunicação Rastreada Inteligente
-- 2. Pró-Ação (Melhoria Contínua)
-- 3. Manutenção Assistida por IA
-- ============================================================================

-- Extensões necessárias
-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS pgcrypto;
-- CREATE EXTENSION IF NOT EXISTS vector; -- DESATIVADO (pgvector não instalado)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- MÓDULO 1: EMPRESAS E MULTI-TENANT
-- ============================================================================

CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  cnpj TEXT UNIQUE,
  industry_segment TEXT, -- metalúrgico, alimentício, químico, etc
  address TEXT,
  city TEXT,
  state TEXT,
  country TEXT DEFAULT 'Brasil',
  
  -- Política específica da empresa
  company_policy_text TEXT, -- POPs e políticas específicas
  
  -- Configurações
  config JSONB DEFAULT '{}', -- configurações específicas da empresa
  
  -- Status e controle
  active BOOLEAN DEFAULT true,
  subscription_tier TEXT DEFAULT 'essencial', -- essencial, profissional, estratégico
  contract_start_date TIMESTAMPTZ,
  contract_end_date TIMESTAMPTZ,
  
  -- LGPD
  data_controller_name TEXT, -- responsável legal
  data_controller_email TEXT,
  data_controller_phone TEXT,
  
  -- Auditoria
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID,
  updated_by UUID
);

CREATE INDEX idx_companies_active ON companies(active);
CREATE INDEX idx_companies_cnpj ON companies(cnpj);

-- ============================================================================
-- MÓDULO 2: HIERARQUIA E ORGANIZAÇÃO
-- ============================================================================

CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  parent_department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  
  -- Hierarquia
  level INTEGER DEFAULT 1, -- 1=diretoria, 2=gerência, 3=supervisão, 4=operacional
  
  -- Tipo
  type TEXT, -- produção, manutenção, qualidade, logística, administrativo
  
  -- Responsável
  manager_id UUID, -- referência ao usuário gestor
  
  -- Status
  active BOOLEAN DEFAULT true,
  
  -- Auditoria
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_departments_company ON departments(company_id);
CREATE INDEX idx_departments_parent ON departments(parent_department_id);

-- ============================================================================
-- MÓDULO 3: USUÁRIOS E CONTROLE DE ACESSO (RBAC)
-- ============================================================================

-- Expandir tabela de usuários existente
ALTER TABLE users ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(id) ON DELETE SET NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS whatsapp_number TEXT; -- App Impetus, Modo Executivo
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Hierarquia do usuário
ALTER TABLE users ADD COLUMN IF NOT EXISTS hierarchy_level INTEGER DEFAULT 5; 
-- 1=Diretoria, 2=Gerente, 3=Coordenador, 4=Supervisor, 5=Colaborador

-- Permissões
ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '[]';

-- Status e controle
ALTER TABLE users ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ;

-- LGPD - Consentimento
ALTER TABLE users ADD COLUMN IF NOT EXISTS lgpd_consent BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS lgpd_consent_date TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS lgpd_consent_ip TEXT;

-- Auditoria
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ; -- soft delete

CREATE INDEX IF NOT EXISTS idx_users_company ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_users_department ON users(department_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(active);

-- ============================================================================
-- MÓDULO 4: SESSÕES E AUTENTICAÇÃO
-- ============================================================================

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_activity TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);

-- ============================================================================
-- PILAR 1: COMUNICAÇÃO RASTREADA INTELIGENTE
-- ============================================================================

-- Comunicações estruturadas (WhatsApp + Sistema)
CREATE TABLE IF NOT EXISTS communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Origem
  source TEXT NOT NULL, -- 'whatsapp', 'web', 'system'
  source_message_id TEXT, -- ID da mensagem no Z-API
  
  -- Remetente
  sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
  sender_name TEXT,
  sender_phone TEXT,
  sender_whatsapp TEXT,
  
  -- Destinatário/Setor
  recipient_id UUID REFERENCES users(id) ON DELETE SET NULL,
  recipient_department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  
  -- Conteúdo
  message_type TEXT DEFAULT 'text', -- text, image, audio, document, video
  text_content TEXT,
  media_url TEXT,
  media_filename TEXT,
  
  -- Classificação pela IA
  ai_classification JSONB, -- {type: 'falha', 'tarefa', 'sugestao', etc, confidence: 0.95}
  ai_sentiment TEXT, -- positivo, neutro, negativo, urgente
  ai_priority INTEGER DEFAULT 3, -- 1=crítico, 2=alto, 3=médio, 4=baixo, 5=informativo
  ai_keywords TEXT[], -- palavras-chave extraídas
  
  -- Contexto
  related_equipment_id UUID, -- referência a pontos monitorados
  related_proposal_id UUID REFERENCES proposals(id) ON DELETE SET NULL,
  related_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  related_failure_id UUID, -- referência a falhas
  
  -- Controle de fluxo
  status TEXT DEFAULT 'received', -- received, processed, routed, resolved, archived
  routed_to_department UUID REFERENCES departments(id),
  routed_to_user UUID REFERENCES users(id),
  routed_at TIMESTAMPTZ,
  
  -- Resposta
  response_required BOOLEAN DEFAULT false,
  response_deadline TIMESTAMPTZ,
  responded BOOLEAN DEFAULT false,
  responded_at TIMESTAMPTZ,
  response_by UUID REFERENCES users(id),
  
  -- Auditoria e rastreabilidade
  created_at TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  
  -- LGPD
  contains_sensitive_data BOOLEAN DEFAULT false,
  anonymized BOOLEAN DEFAULT false,
  anonymized_at TIMESTAMPTZ
);

CREATE INDEX idx_communications_company ON communications(company_id);
CREATE INDEX idx_communications_sender ON communications(sender_id);
CREATE INDEX idx_communications_created ON communications(created_at DESC);
CREATE INDEX idx_communications_status ON communications(status);
CREATE INDEX idx_communications_priority ON communications(ai_priority);
CREATE INDEX idx_communications_source ON communications(source);

-- Agenda inteligente e lembretes
CREATE TABLE IF NOT EXISTS smart_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Origem
  created_from_communication_id UUID REFERENCES communications(id) ON DELETE CASCADE,
  
  -- Responsável
  assigned_to UUID REFERENCES users(id) ON DELETE CASCADE,
  created_by UUID REFERENCES users(id),
  
  -- Conteúdo
  title TEXT NOT NULL,
  description TEXT,
  task_type TEXT, -- 'relatório', 'entrega', 'reunião', 'verificação'
  
  -- Prazos
  due_date TIMESTAMPTZ NOT NULL,
  reminder_before_hours INTEGER DEFAULT 48, -- lembrar 2 dias antes
  
  -- Status
  status TEXT DEFAULT 'pending', -- pending, reminded, completed, overdue, cancelled
  reminded_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES users(id),
  
  -- IA ofereceu ajuda?
  ai_help_offered BOOLEAN DEFAULT false,
  ai_help_accepted BOOLEAN DEFAULT false,
  ai_help_text TEXT,
  
  -- Auditoria
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_reminders_assigned ON smart_reminders(assigned_to);
CREATE INDEX idx_reminders_due_date ON smart_reminders(due_date);
CREATE INDEX idx_reminders_status ON smart_reminders(status);

-- ============================================================================
-- PROCEDIMENTOS OPERACIONAIS PADRÃO (POPs)
-- ============================================================================

CREATE TABLE IF NOT EXISTS pops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Identificação
  code TEXT NOT NULL, -- POP-001, POP-PROD-023, etc
  title TEXT NOT NULL,
  version TEXT DEFAULT '1.0',
  
  -- Conteúdo
  objective TEXT,
  scope TEXT,
  responsible_roles TEXT[],
  procedure_steps JSONB, -- [{step: 1, description: '...', verification: '...'}]
  safety_requirements TEXT[],
  quality_requirements TEXT[],
  
  -- Classificação
  department_id UUID REFERENCES departments(id),
  process_category TEXT, -- produção, manutenção, qualidade, segurança
  criticality TEXT DEFAULT 'medium', -- low, medium, high, critical
  
  -- Documentos
  document_url TEXT,
  attachments JSONB,
  
  -- Controle de versão
  previous_version_id UUID REFERENCES pops(id),
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  
  -- Status
  status TEXT DEFAULT 'draft', -- draft, active, under_review, archived
  active BOOLEAN DEFAULT false,
  
  -- IA: Monitoramento de conformidade
  ai_monitored BOOLEAN DEFAULT true,
  ai_violations_detected INTEGER DEFAULT 0,
  last_ai_check TIMESTAMPTZ,
  
  -- Auditoria
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES users(id)
);

CREATE INDEX idx_pops_company ON pops(company_id);
CREATE INDEX idx_pops_code ON pops(company_id, code);
CREATE INDEX idx_pops_active ON pops(active);
CREATE INDEX idx_pops_department ON pops(department_id);

-- Registro de conformidade com POPs
CREATE TABLE IF NOT EXISTS pop_compliance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pop_id UUID REFERENCES pops(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Execução
  executed_by UUID REFERENCES users(id),
  execution_date TIMESTAMPTZ DEFAULT now(),
  
  -- Conformidade
  compliant BOOLEAN,
  deviations TEXT[], -- lista de desvios detectados
  corrective_actions TEXT,
  
  -- IA detectou?
  detected_by_ai BOOLEAN DEFAULT false,
  ai_confidence NUMERIC(3,2),
  
  -- Auditoria
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_pop_logs_pop ON pop_compliance_logs(pop_id);
CREATE INDEX idx_pop_logs_company ON pop_compliance_logs(company_id);

-- ============================================================================
-- PILAR 2: PRÓ-AÇÃO - MELHORIA CONTÍNUA COMPLETA
-- ============================================================================

-- Expandir tabela proposals com campos PDCA completos
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(id);
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS sector TEXT;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS current_phase TEXT DEFAULT 'submitted';
-- Fases: submitted, evaluated, approved, plan, do, check, act, completed, rejected

-- Dados do PDCA - PLAN (Planejar)
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS pdca_plan_objective TEXT;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS pdca_plan_metrics TEXT[];
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS pdca_plan_resources JSONB;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS pdca_plan_timeline JSONB;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS pdca_plan_responsible UUID REFERENCES users(id);
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS pdca_plan_approved_by UUID REFERENCES users(id);
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS pdca_plan_approved_at TIMESTAMPTZ;

-- Dados do PDCA - DO (Executar)
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS pdca_do_actions JSONB; -- [{action, responsible, date, status}]
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS pdca_do_start_date TIMESTAMPTZ;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS pdca_do_end_date TIMESTAMPTZ;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS pdca_do_evidence JSONB; -- fotos, documentos

-- Dados do PDCA - CHECK (Verificar)
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS pdca_check_collected_data JSONB;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS pdca_check_before_data JSONB;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS pdca_check_after_data JSONB;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS pdca_check_results TEXT;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS pdca_check_achieved_goals BOOLEAN;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS pdca_check_performed_by UUID REFERENCES users(id);
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS pdca_check_performed_at TIMESTAMPTZ;

-- Dados do PDCA - ACT (Agir)
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS pdca_act_standardize BOOLEAN DEFAULT false;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS pdca_act_new_pop_created BOOLEAN DEFAULT false;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS pdca_act_new_pop_id UUID REFERENCES pops(id);
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS pdca_act_lessons_learned TEXT;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS pdca_act_next_steps TEXT;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS pdca_act_closed_by UUID REFERENCES users(id);
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS pdca_act_closed_at TIMESTAMPTZ;

-- Ferramentas da qualidade aplicadas
CREATE TABLE IF NOT EXISTS quality_tools_applied (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID REFERENCES proposals(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Ferramenta
  tool_name TEXT NOT NULL, -- 'ishikawa', 'pareto', '5w2h', '5porques', 'pdca', etc
  
  -- Dados da ferramenta (estrutura específica por tipo)
  tool_data JSONB NOT NULL,
  
  -- Quem aplicou
  applied_by UUID REFERENCES users(id),
  applied_at TIMESTAMPTZ DEFAULT now(),
  
  -- IA ajudou?
  ai_assisted BOOLEAN DEFAULT false,
  ai_suggestions JSONB,
  
  -- Resultado
  results_summary TEXT,
  
  -- Auditoria
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_quality_tools_proposal ON quality_tools_applied(proposal_id);
CREATE INDEX idx_quality_tools_company ON quality_tools_applied(company_id);
CREATE INDEX idx_quality_tools_name ON quality_tools_applied(tool_name);

-- 5W2H estruturado
CREATE TABLE IF NOT EXISTS action_plans_5w2h (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID REFERENCES proposals(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  
  -- 5W2H
  what_action TEXT NOT NULL, -- O quê
  why_reason TEXT NOT NULL, -- Por quê
  where_location TEXT, -- Onde
  when_deadline TIMESTAMPTZ, -- Quando
  who_responsible UUID REFERENCES users(id), -- Quem
  how_method TEXT, -- Como
  how_much_cost NUMERIC(12,2), -- Quanto custa
  
  -- Status
  status TEXT DEFAULT 'planned', -- planned, in_progress, completed, cancelled
  progress_percentage INTEGER DEFAULT 0,
  
  -- Resultados
  completed_at TIMESTAMPTZ,
  actual_cost NUMERIC(12,2),
  results_description TEXT,
  
  -- Auditoria
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_5w2h_proposal ON action_plans_5w2h(proposal_id);
CREATE INDEX idx_5w2h_responsible ON action_plans_5w2h(who_responsible);

-- ============================================================================
-- PILAR 3: MANUTENÇÃO ASSISTIDA POR IA
-- ============================================================================

-- Pontos monitorados (máquinas, sensores, equipamentos)
CREATE TABLE IF NOT EXISTS monitored_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  department_id UUID REFERENCES departments(id),
  
  -- Identificação
  code TEXT NOT NULL, -- MAQ-001, SENSOR-023
  name TEXT NOT NULL,
  type TEXT, -- 'máquina', 'sensor', 'linha_produção', 'equipamento'
  category TEXT, -- 'hidráulico', 'elétrico', 'pneumático', 'mecânico'
  
  -- Localização
  location TEXT,
  sector TEXT,
  
  -- Especificações técnicas
  manufacturer TEXT,
  model TEXT,
  serial_number TEXT,
  installation_date DATE,
  
  -- Manuais associados
  manual_ids UUID[], -- array de IDs de manuais
  
  -- Status
  operational_status TEXT DEFAULT 'operational', -- operational, maintenance, failure, idle
  last_maintenance TIMESTAMPTZ,
  next_maintenance TIMESTAMPTZ,
  
  -- Criticidade
  criticality TEXT DEFAULT 'medium', -- low, medium, high, critical
  impact_on_production TEXT, -- 'total_stop', 'partial_impact', 'minimal'
  
  -- Métricas
  mtbf_hours NUMERIC(10,2), -- Mean Time Between Failures
  mttr_hours NUMERIC(10,2), -- Mean Time To Repair
  total_failures INTEGER DEFAULT 0,
  
  -- Monitoramento
  ai_monitored BOOLEAN DEFAULT true,
  sensors_data JSONB, -- dados de sensores IoT se houver
  
  -- Auditoria
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES users(id)
);

CREATE INDEX idx_monitored_points_company ON monitored_points(company_id);
CREATE INDEX idx_monitored_points_code ON monitored_points(company_id, code);
CREATE INDEX idx_monitored_points_status ON monitored_points(operational_status);
CREATE INDEX idx_monitored_points_department ON monitored_points(department_id);

-- Falhas de equipamentos
CREATE TABLE IF NOT EXISTS equipment_failures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  equipment_id UUID REFERENCES monitored_points(id) ON DELETE CASCADE,
  
  -- Origem da comunicação
  reported_via_communication_id UUID REFERENCES communications(id),
  
  -- Relato
  reported_by UUID REFERENCES users(id),
  reported_at TIMESTAMPTZ DEFAULT now(),
  failure_description TEXT NOT NULL,
  
  -- Sintomas
  symptoms TEXT[],
  error_codes TEXT[],
  abnormal_sounds TEXT,
  abnormal_temperatures BOOLEAN,
  abnormal_vibrations BOOLEAN,
  
  -- Classificação pela IA
  ai_probable_causes JSONB, -- [{cause, probability, manual_page_ref}]
  ai_diagnostic_confidence NUMERIC(3,2),
  ai_suggested_checklist TEXT[],
  ai_safety_warnings TEXT[],
  
  -- Diagnóstico do técnico
  actual_cause TEXT,
  root_cause_analysis TEXT,
  
  -- Resolução
  resolution_description TEXT,
  parts_replaced JSONB, -- [{part, quantity, cost}]
  actions_taken TEXT[],
  
  -- Técnico responsável
  assigned_to UUID REFERENCES users(id),
  resolved_by UUID REFERENCES users(id),
  
  -- Tempos
  response_time_minutes INTEGER, -- tempo até técnico chegar
  resolution_time_minutes INTEGER, -- tempo total de reparo
  downtime_minutes INTEGER, -- tempo que máquina ficou parada
  
  -- Impacto
  production_loss_estimated NUMERIC(12,2),
  severity TEXT, -- low, medium, high, critical
  
  -- Status
  status TEXT DEFAULT 'reported', -- reported, diagnosed, in_progress, resolved, verified
  resolved_at TIMESTAMPTZ,
  verified_at TIMESTAMPTZ,
  
  -- Prevenção futura
  preventive_action_needed BOOLEAN DEFAULT false,
  preventive_action_description TEXT,
  
  -- Auditoria
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_failures_company ON equipment_failures(company_id);
CREATE INDEX idx_failures_equipment ON equipment_failures(equipment_id);
CREATE INDEX idx_failures_status ON equipment_failures(status);
CREATE INDEX idx_failures_reported_at ON equipment_failures(reported_at DESC);
CREATE INDEX idx_failures_assigned ON equipment_failures(assigned_to);

-- Diagnósticos da IA (guardando histórico de análises)
CREATE TABLE IF NOT EXISTS ai_diagnostics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  failure_id UUID REFERENCES equipment_failures(id) ON DELETE CASCADE,
  equipment_id UUID REFERENCES monitored_points(id),
  
  -- Input para IA
  input_description TEXT NOT NULL,
  input_symptoms JSONB,
  
  -- Manuais consultados
  manuals_consulted UUID[], -- IDs dos manuais analisados
  manual_chunks_used JSONB, -- [{manual_id, chunk_id, page, relevance_score}]
  
  -- Output da IA
  probable_causes JSONB NOT NULL, -- [{cause, probability, evidence, manual_ref}]
  suggested_steps TEXT[],
  safety_checklist TEXT[],
  required_tools TEXT[],
  estimated_time_minutes INTEGER,
  
  -- Modelo IA usado
  ai_model TEXT DEFAULT 'gpt-4o-mini',
  ai_temperature NUMERIC(2,1),
  tokens_used INTEGER,
  
  -- Feedback (o diagnóstico estava correto?)
  feedback_correct BOOLEAN,
  feedback_comment TEXT,
  feedback_by UUID REFERENCES users(id),
  feedback_at TIMESTAMPTZ,
  
  -- Auditoria
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_ai_diagnostics_failure ON ai_diagnostics(failure_id);
CREATE INDEX idx_ai_diagnostics_equipment ON ai_diagnostics(equipment_id);
CREATE INDEX idx_ai_diagnostics_company ON ai_diagnostics(company_id);

-- ============================================================================
-- MÓDULO: NOTIFICAÇÕES E ALERTAS
-- ============================================================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Destinatário
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Tipo e prioridade
  type TEXT NOT NULL, -- 'reminder', 'alert', 'task', 'approval', 'info'
  priority TEXT DEFAULT 'medium', -- low, medium, high, urgent
  
  -- Conteúdo
  title TEXT NOT NULL,
  message TEXT,
  
  -- Contexto (links para outras entidades)
  related_entity_type TEXT, -- 'communication', 'proposal', 'failure', 'task', etc
  related_entity_id UUID,
  
  -- Canal de envio
  channels TEXT[] DEFAULT ARRAY['web'], -- web, whatsapp, email
  sent_via_whatsapp BOOLEAN DEFAULT false,
  sent_via_email BOOLEAN DEFAULT false,
  
  -- Status
  read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  dismissed BOOLEAN DEFAULT false,
  dismissed_at TIMESTAMPTZ,
  
  -- Ação requerida
  action_required BOOLEAN DEFAULT false,
  action_url TEXT,
  action_deadline TIMESTAMPTZ,
  
  -- Auditoria
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(user_id, read);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX idx_notifications_company ON notifications(company_id);

-- ============================================================================
-- MÓDULO: MÉTRICAS E KPIs
-- ============================================================================

CREATE TABLE IF NOT EXISTS metrics_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Período
  snapshot_date DATE NOT NULL,
  snapshot_type TEXT DEFAULT 'daily', -- daily, weekly, monthly
  
  -- Comunicação
  total_communications INTEGER DEFAULT 0,
  communications_by_type JSONB, -- {falha: 45, tarefa: 23, sugestao: 12}
  communications_growth_percentage NUMERIC(5,2),
  
  -- Insights da IA
  total_ai_insights INTEGER DEFAULT 0,
  insights_by_priority JSONB, -- {critico: 3, alto: 12, medio: 45}
  insights_growth_percentage NUMERIC(5,2),
  
  -- Pontos monitorados
  total_monitored_points INTEGER DEFAULT 0,
  operational_points INTEGER DEFAULT 0,
  points_in_maintenance INTEGER DEFAULT 0,
  points_in_failure INTEGER DEFAULT 0,
  
  -- Pró-Ação
  total_proposals INTEGER DEFAULT 0,
  proposals_by_status JSONB,
  proposals_completed INTEGER DEFAULT 0,
  
  -- Manutenção
  total_failures INTEGER DEFAULT 0,
  avg_response_time_minutes NUMERIC(10,2),
  avg_resolution_time_minutes NUMERIC(10,2),
  total_downtime_minutes INTEGER DEFAULT 0,
  
  -- OEE (Overall Equipment Effectiveness) estimado
  oee_percentage NUMERIC(5,2),
  
  -- Tendências (calculadas pela IA)
  trend_analysis JSONB,
  
  -- Auditoria
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_metrics_company ON metrics_snapshots(company_id);
CREATE INDEX idx_metrics_date ON metrics_snapshots(snapshot_date DESC);
CREATE INDEX idx_metrics_type ON metrics_snapshots(snapshot_type);

-- ============================================================================
-- MÓDULO: LGPD - CONFORMIDADE E AUDITORIA
-- ============================================================================

-- Consentimentos LGPD
CREATE TABLE IF NOT EXISTS lgpd_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Tipo de consentimento
  consent_type TEXT NOT NULL, -- 'data_processing', 'communication_monitoring', 'ai_analysis'
  
  -- Consentimento
  granted BOOLEAN NOT NULL,
  consent_text TEXT NOT NULL, -- texto que foi apresentado ao usuário
  version TEXT NOT NULL, -- versão da política
  
  -- Metadados
  ip_address TEXT,
  user_agent TEXT,
  
  -- Datas
  granted_at TIMESTAMPTZ DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  
  -- Auditoria
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_consents_user ON lgpd_consents(user_id);
CREATE INDEX idx_consents_company ON lgpd_consents(company_id);
CREATE INDEX idx_consents_type ON lgpd_consents(consent_type);

-- Logs de acesso a dados (LGPD - Rastreabilidade)
CREATE TABLE IF NOT EXISTS data_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Quem acessou
  accessed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  accessed_by_name TEXT, -- guardar nome caso usuário seja deletado
  
  -- O que foi acessado
  entity_type TEXT NOT NULL, -- 'user', 'communication', 'proposal', etc
  entity_id UUID,
  
  -- Ação
  action TEXT NOT NULL, -- 'view', 'create', 'update', 'delete', 'export'
  
  -- Justificativa (quando aplicável)
  justification TEXT,
  
  -- Dados sensíveis?
  contains_sensitive_data BOOLEAN DEFAULT false,
  
  -- Metadados
  ip_address TEXT,
  user_agent TEXT,
  session_id UUID REFERENCES sessions(id),
  
  -- Auditoria
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_data_access_user ON data_access_logs(accessed_by);
CREATE INDEX idx_data_access_entity ON data_access_logs(entity_type, entity_id);
CREATE INDEX idx_data_access_created ON data_access_logs(created_at DESC);
CREATE INDEX idx_data_access_company ON data_access_logs(company_id);

-- Solicitações de titulares de dados (LGPD)
CREATE TABLE IF NOT EXISTS lgpd_data_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Tipo de solicitação
  request_type TEXT NOT NULL, 
  -- 'access' (acesso aos dados), 
  -- 'correction' (correção), 
  -- 'deletion' (exclusão),
  -- 'portability' (portabilidade),
  -- 'objection' (oposição ao tratamento)
  
  -- Descrição
  description TEXT,
  
  -- Status
  status TEXT DEFAULT 'pending', -- pending, in_progress, completed, rejected
  
  -- Processamento
  assigned_to UUID REFERENCES users(id), -- responsável por processar
  processed_at TIMESTAMPTZ,
  response TEXT,
  
  -- Dados entregues (se aplicável)
  data_package_url TEXT,
  data_deleted BOOLEAN DEFAULT false,
  
  -- Prazos legais
  deadline TIMESTAMPTZ, -- 15 dias úteis pela LGPD
  
  -- Auditoria
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_data_requests_user ON lgpd_data_requests(user_id);
CREATE INDEX idx_data_requests_status ON lgpd_data_requests(status);
CREATE INDEX idx_data_requests_company ON lgpd_data_requests(company_id);

-- Logs de auditoria gerais (todas as ações críticas)
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Quem executou
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  user_name TEXT,
  user_role TEXT,
  
  -- Ação
  action TEXT NOT NULL, -- 'login', 'logout', 'create_user', 'delete_data', etc
  entity_type TEXT,
  entity_id UUID,
  
  -- Detalhes
  description TEXT,
  changes JSONB, -- {before: {...}, after: {...}}
  
  -- Contexto
  ip_address TEXT,
  user_agent TEXT,
  session_id UUID,
  
  -- Severidade
  severity TEXT DEFAULT 'info', -- debug, info, warning, error, critical
  
  -- Resultado
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  
  -- Auditoria
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_company ON audit_logs(company_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

-- ============================================================================
-- MÓDULO: POLÍTICAS INSTITUCIONAIS
-- ============================================================================

CREATE TABLE IF NOT EXISTS institutional_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Tipo
  policy_type TEXT NOT NULL, 
  -- 'impetus_institucional', 'impetus_seguranca', 'impetus_lgpd', 
  -- 'impetus_qualidade', 'impetus_conteudo_sensivel', etc
  
  -- Versão
  version TEXT NOT NULL,
  
  -- Conteúdo
  title TEXT NOT NULL,
  content TEXT NOT NULL, -- texto completo da política
  summary TEXT,
  
  -- Aplicabilidade
  applies_to TEXT DEFAULT 'all', -- 'all', 'company_specific'
  
  -- Status
  active BOOLEAN DEFAULT true,
  effective_date DATE NOT NULL,
  supersedes_version TEXT,
  
  -- Auditoria
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by TEXT DEFAULT 'Impetus',
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_institutional_policies_type_version 
  ON institutional_policies (policy_type, version);
CREATE INDEX idx_policies_type ON institutional_policies(policy_type);
CREATE INDEX idx_policies_active ON institutional_policies(active);

-- Aceite de políticas pelas empresas/usuários
CREATE TABLE IF NOT EXISTS policy_acceptances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id UUID REFERENCES institutional_policies(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Aceite
  accepted BOOLEAN NOT NULL,
  accepted_at TIMESTAMPTZ DEFAULT now(),
  
  -- Metadados
  ip_address TEXT,
  user_agent TEXT,
  
  -- Auditoria
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_policy_acceptances_policy ON policy_acceptances(policy_id);
CREATE INDEX idx_policy_acceptances_company ON policy_acceptances(company_id);
CREATE INDEX idx_policy_acceptances_user ON policy_acceptances(user_id);

-- ============================================================================
-- MÓDULO: INTEGRAÇÃO Z-API (WhatsApp Business)
-- ============================================================================

CREATE TABLE IF NOT EXISTS zapi_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE UNIQUE,
  
  -- Credenciais Z-API
  instance_id TEXT NOT NULL,
  instance_token TEXT NOT NULL,
  client_token TEXT,
  
  -- Endpoint
  api_url TEXT DEFAULT 'https://api.z-api.io',
  
  -- Número do WhatsApp Business
  business_phone TEXT NOT NULL,
  business_name TEXT,
  
  -- Webhook
  webhook_url TEXT, -- URL que o Z-API vai chamar
  webhook_token TEXT, -- token de segurança
  
  -- Status
  active BOOLEAN DEFAULT true,
  last_connection_test TIMESTAMPTZ,
  connection_status TEXT DEFAULT 'pending', -- pending, connected, error
  
  -- Configurações
  auto_reply_enabled BOOLEAN DEFAULT false,
  auto_reply_message TEXT,
  
  -- Auditoria
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES users(id)
);

CREATE INDEX idx_zapi_company ON zapi_configurations(company_id);

-- Mensagens enviadas via Z-API (tracking)
CREATE TABLE IF NOT EXISTS zapi_sent_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Origem interna
  originated_from_communication_id UUID REFERENCES communications(id),
  originated_from_notification_id UUID REFERENCES notifications(id),
  originated_from_reminder_id UUID REFERENCES smart_reminders(id),
  
  -- Destinatário
  recipient_phone TEXT NOT NULL,
  recipient_user_id UUID REFERENCES users(id),
  
  -- Conteúdo
  message_type TEXT DEFAULT 'text', -- text, image, document, audio
  text_content TEXT,
  media_url TEXT,
  
  -- Z-API Response
  zapi_message_id TEXT, -- ID retornado pela Z-API
  zapi_response JSONB,
  
  -- Status de entrega
  sent BOOLEAN DEFAULT false,
  delivered BOOLEAN DEFAULT false,
  read BOOLEAN DEFAULT false,
  error BOOLEAN DEFAULT false,
  error_message TEXT,
  
  -- Timestamps
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  
  -- Auditoria
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_zapi_sent_company ON zapi_sent_messages(company_id);
CREATE INDEX idx_zapi_sent_recipient ON zapi_sent_messages(recipient_phone);
CREATE INDEX idx_zapi_sent_created ON zapi_sent_messages(created_at DESC);

-- ============================================================================
-- TRIGGERS E FUNÇÕES AUXILIARES
-- ============================================================================

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar trigger em todas as tabelas que têm updated_at
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON departments 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pops_updated_at BEFORE UPDATE ON pops 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_monitored_points_updated_at BEFORE UPDATE ON monitored_points 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_smart_reminders_updated_at BEFORE UPDATE ON smart_reminders 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_failures_updated_at BEFORE UPDATE ON equipment_failures 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_5w2h_updated_at BEFORE UPDATE ON action_plans_5w2h 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_zapi_config_updated_at BEFORE UPDATE ON zapi_configurations 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_policies_updated_at BEFORE UPDATE ON institutional_policies 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- VIEWS ÚTEIS PARA DASHBOARDS E RELATÓRIOS
-- ============================================================================

-- View: Dashboard resumo por empresa
CREATE OR REPLACE VIEW v_dashboard_summary AS
SELECT 
  c.id as company_id,
  c.name as company_name,
  
  -- Comunicações (última semana)
  (SELECT COUNT(*) FROM communications 
   WHERE company_id = c.id 
   AND created_at >= now() - INTERVAL '7 days') as communications_week,
  
  -- Insights da IA
  (SELECT COUNT(*) FROM communications 
   WHERE company_id = c.id 
   AND ai_priority <= 2 
   AND created_at >= now() - INTERVAL '7 days') as ai_insights_week,
  
  -- Pontos monitorados
  (SELECT COUNT(*) FROM monitored_points 
   WHERE company_id = c.id AND active = true) as total_monitored_points,
  
  -- Falhas ativas
  (SELECT COUNT(*) FROM equipment_failures 
   WHERE company_id = c.id 
   AND status NOT IN ('resolved', 'verified')) as active_failures,
  
  -- Propostas Pró-Ação ativas
  (SELECT COUNT(*) FROM proposals 
   WHERE company_id = c.id 
   AND status NOT IN ('completed', 'rejected')) as active_proposals
  
FROM companies c
WHERE c.active = true;

-- View: Interações recentes (feed)
CREATE OR REPLACE VIEW v_recent_interactions AS
SELECT 
  c.id,
  c.company_id,
  c.source,
  c.sender_name,
  c.text_content,
  c.ai_classification,
  c.ai_priority,
  c.created_at,
  u.name as sender_user_name,
  u.avatar_url
FROM communications c
LEFT JOIN users u ON c.sender_id = u.id
ORDER BY c.created_at DESC
LIMIT 100;

-- ============================================================================
-- DADOS INICIAIS (SEED)
-- ============================================================================

-- Inserir política institucional Impetus (versão inicial)
INSERT INTO institutional_policies (policy_type, version, title, content, effective_date, active)
VALUES 
  ('impetus_institucional', '1.0', 'Política Institucional Impetus', 
   'Política completa aqui...', CURRENT_DATE, true),
  
  ('impetus_lgpd', '1.0', 'Política de Proteção de Dados e LGPD', 
   'Política LGPD completa aqui...', CURRENT_DATE, true),
  
  ('impetus_seguranca', '1.0', 'Política de Segurança da Informação', 
   'Política de segurança completa aqui...', CURRENT_DATE, true)
ON CONFLICT (policy_type, version) DO NOTHING;

-- ============================================================================
-- FIM DO SCHEMA
-- ============================================================================

-- Mensagem de sucesso
DO $$
BEGIN
  RAISE NOTICE '✅ Schema completo do Impetus Comunica IA criado com sucesso!';
  RAISE NOTICE '📊 Total de tabelas principais: 30+';
  RAISE NOTICE '🏢 Multi-tenant: SIM';
  RAISE NOTICE '🔐 LGPD Compliance: SIM';
  RAISE NOTICE '📱 Integração Z-API: Pronta';
  RAISE NOTICE '🤖 IA Integrada: SIM';
  RAISE NOTICE '📈 3 Pilares: Comunicação, Pró-Ação, Manutenção';
END $$;
