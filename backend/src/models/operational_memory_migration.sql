-- ============================================================================
-- IMPETUS - MEMÓRIA OPERACIONAL E CÉREBRO DE DADOS
-- Claude como camada analítica: fatos estruturados extraídos de dados do sistema
-- Memória principal no banco - Claude apenas processa e enriquece
-- Isolamento por empresa (multi-tenant) e auditoria obrigatória
-- ============================================================================

-- 1) Memória operacional - fatos estruturados por empresa
CREATE TABLE IF NOT EXISTS operational_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Escopo (user, sector, machine, line, process, org)
  scope_type TEXT NOT NULL CHECK (scope_type IN ('user', 'sector', 'machine', 'line', 'process', 'org')),
  scope_id UUID, -- user_id, sector_id, machine_id, etc. (depende do scope_type)
  scope_label TEXT, -- nome legível (ex: "Linha 2", "Máquina X", "Setor Manutenção")

  -- Tipo e conteúdo do fato
  fact_type TEXT NOT NULL CHECK (fact_type IN (
    'pendencia', 'risco', 'decisao', 'solicitacao', 'falha', 'tarefa',
    'informacao', 'observacao', 'padrao', 'recorrencia', 'feedback', 'contexto'
  )),
  content TEXT NOT NULL,
  summary TEXT,

  -- Prioridade e criticidade
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('baixa', 'normal', 'alta', 'critica')),

  -- Origem (de onde veio esse fato)
  source_type TEXT NOT NULL, -- chat_impetus, internal_chat, registro_inteligente, proacao, os, evento
  source_id UUID, -- id da conversa, registro, OS, etc.
  source_metadata JSONB DEFAULT '{}',

  -- Metadados adicionais (entidades, datas, vínculos)
  metadata JSONB DEFAULT '{}',

  -- Controle
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ, -- opcional: fatos temporais podem expirar
  is_active BOOLEAN DEFAULT true
);

CREATE INDEX idx_operational_memory_company ON operational_memory(company_id);
CREATE INDEX idx_operational_memory_scope ON operational_memory(company_id, scope_type, scope_id);
CREATE INDEX idx_operational_memory_fact_type ON operational_memory(company_id, fact_type);
CREATE INDEX idx_operational_memory_created ON operational_memory(company_id, created_at DESC);
CREATE INDEX idx_operational_memory_priority ON operational_memory(company_id, priority) WHERE priority IN ('alta', 'critica');
CREATE INDEX idx_operational_memory_active ON operational_memory(company_id) WHERE is_active = true;

-- Full-text search para consultas contextuais
CREATE INDEX IF NOT EXISTS idx_operational_memory_content_fts ON operational_memory
  USING GIN(to_tsvector('portuguese', coalesce(content, '') || ' ' || coalesce(summary, '') || ' ' || coalesce(scope_label, '')));

-- 2) Auditoria de uso da memória (governança)
CREATE TABLE IF NOT EXISTS memory_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,

  action TEXT NOT NULL, -- query_context, read_facts, ingestion, feedback_generated
  scope_filter JSONB DEFAULT '{}', -- filtros aplicados na consulta
  facts_count INTEGER DEFAULT 0,
  source_type TEXT,
  source_id UUID,

  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_memory_audit_company ON memory_audit_log(company_id);
CREATE INDEX idx_memory_audit_user ON memory_audit_log(user_id);
CREATE INDEX idx_memory_audit_created ON memory_audit_log(created_at DESC);
CREATE INDEX idx_memory_audit_action ON memory_audit_log(action);

COMMENT ON TABLE operational_memory IS 'Memória operacional estruturada - Claude processa, banco persiste';
COMMENT ON TABLE memory_audit_log IS 'Auditoria de consultas e uso da memória operacional';
