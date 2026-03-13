-- =============================================================================
-- IMPETUS - Arquitetura Tríade de IAs - Memória Empresarial e Conhecimento
-- enterprise_ai_memory: insights, eventos, alertas gerados pelas IAs
-- industry_intelligence_memory: padrões operacionais, histórico, soluções
-- company_operation_memory: dados cadastrados via "Cadastrar com IA"
-- =============================================================================

-- 1. Memória da IA Empresarial (insights, eventos, alertas)
CREATE TABLE IF NOT EXISTS enterprise_ai_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  source_ai VARCHAR(32) NOT NULL, -- 'claude'|'gemini'|'chatgpt'
  memory_type VARCHAR(32) NOT NULL, -- 'insight'|'evento'|'alerta'|'padrao'|'recomendacao'
  content TEXT,
  structured_data JSONB DEFAULT '{}',
  confidence DECIMAL(5,2) DEFAULT 1.0, -- 0-1
  validated BOOLEAN DEFAULT FALSE,
  cross_validated_by VARCHAR(32)[], -- IAs que confirmaram
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_enterprise_ai_memory_company ON enterprise_ai_memory(company_id);
CREATE INDEX IF NOT EXISTS idx_enterprise_ai_memory_source ON enterprise_ai_memory(source_ai);
CREATE INDEX IF NOT EXISTS idx_enterprise_ai_memory_type ON enterprise_ai_memory(memory_type);
CREATE INDEX IF NOT EXISTS idx_enterprise_ai_memory_created ON enterprise_ai_memory(created_at DESC);

-- 2. Memória de Inteligência Industrial (padrões, histórico, soluções)
CREATE TABLE IF NOT EXISTS industry_intelligence_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  event_type VARCHAR(64),
  cause_identified TEXT,
  solution_applied TEXT,
  result_summary TEXT,
  source_ai VARCHAR(32),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_industry_intel_company ON industry_intelligence_memory(company_id);
CREATE INDEX IF NOT EXISTS idx_industry_intel_event ON industry_intelligence_memory(event_type);

-- 3. Memória de Operação da Empresa (cadastrado via IA)
CREATE TABLE IF NOT EXISTS company_operation_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  category VARCHAR(64) NOT NULL, -- 'equipamento'|'processo'|'custo'|'material'|'fornecedor'|'documento'|'rotina'
  content JSONB NOT NULL DEFAULT '{}',
  source_input VARCHAR(32), -- 'texto'|'imagem'|'documento'|'audio'|'video'
  sector VARCHAR(64),
  related_equipment VARCHAR(128),
  related_process VARCHAR(128),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_company_op_mem_company ON company_operation_memory(company_id);
CREATE INDEX IF NOT EXISTS idx_company_op_mem_category ON company_operation_memory(category);
CREATE INDEX IF NOT EXISTS idx_company_op_mem_sector ON company_operation_memory(sector);

-- 4. Troca de conhecimento entre IAs (AI Knowledge Exchange)
CREATE TABLE IF NOT EXISTS ai_knowledge_exchange (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  from_ai VARCHAR(32) NOT NULL,
  to_ai VARCHAR(32) NOT NULL,
  exchange_type VARCHAR(32), -- 'insight'|'padrao'|'evento'|'recomendacao'
  payload JSONB NOT NULL DEFAULT '{}',
  consumed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_knowledge_company ON ai_knowledge_exchange(company_id);
CREATE INDEX IF NOT EXISTS idx_ai_knowledge_to_ai ON ai_knowledge_exchange(to_ai, consumed);

COMMENT ON TABLE enterprise_ai_memory IS 'Memória da tríade de IAs - insights, eventos, alertas';
COMMENT ON TABLE industry_intelligence_memory IS 'Padrões operacionais e soluções históricas';
COMMENT ON TABLE company_operation_memory IS 'Conhecimento cadastrado via módulo Cadastrar com IA';
COMMENT ON TABLE ai_knowledge_exchange IS 'Troca de descobertas entre Claude, Gemini e ChatGPT';
