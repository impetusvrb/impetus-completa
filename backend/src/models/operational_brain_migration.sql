-- ============================================================================
-- IMPETUS - CÉREBRO OPERACIONAL DA EMPRESA
-- Núcleo de inteligência: insights, alertas, mapa de conhecimento, timeline
-- ============================================================================

-- 1. OPERATIONAL_INSIGHTS - Insights automáticos gerados pela IA
CREATE TABLE IF NOT EXISTS operational_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  categoria TEXT NOT NULL CHECK (categoria IN ('producao', 'manutencao', 'qualidade', 'gestao', 'geral')),
  titulo TEXT NOT NULL,
  descricao TEXT,
  tipo_insight TEXT,
  severidade TEXT CHECK (severidade IN ('informativo', 'atencao', 'critico')),

  equipamento TEXT,
  linha TEXT,
  peca TEXT,
  metadados JSONB DEFAULT '{}',

  fonte_evento_id UUID,
  fonte_tabela TEXT,
  lido BOOLEAN DEFAULT false,
  lido_por UUID REFERENCES users(id) ON DELETE SET NULL,
  lido_em TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_operational_insights_company ON operational_insights(company_id);
CREATE INDEX IF NOT EXISTS idx_operational_insights_categoria ON operational_insights(company_id, categoria);
CREATE INDEX IF NOT EXISTS idx_operational_insights_created ON operational_insights(company_id, created_at DESC);

-- 2. OPERATIONAL_ALERTS - Alertas inteligentes
CREATE TABLE IF NOT EXISTS operational_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  tipo_alerta TEXT NOT NULL CHECK (tipo_alerta IN (
    'maquina_parada', 'falha_recorrente', 'tarefa_atrasada',
    'problema_nao_resolvido', 'consumo_anormal', 'parada_linha'
  )),
  titulo TEXT NOT NULL,
  mensagem TEXT,
  severidade TEXT CHECK (severidade IN ('baixa', 'media', 'alta', 'critica')),

  equipamento TEXT,
  linha TEXT,
  responsavel_id UUID REFERENCES users(id) ON DELETE SET NULL,
  evento_origem_id UUID,
  metadata JSONB DEFAULT '{}',

  resolvido BOOLEAN DEFAULT false,
  resolvido_por UUID REFERENCES users(id) ON DELETE SET NULL,
  resolvido_em TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_operational_alerts_company ON operational_alerts(company_id);
CREATE INDEX IF NOT EXISTS idx_operational_alerts_tipo ON operational_alerts(company_id, tipo_alerta);
CREATE INDEX IF NOT EXISTS idx_operational_alerts_resolvido ON operational_alerts(company_id) WHERE resolvido = false;

-- 3. KNOWLEDGE_MEMORY - Adicionar categoria ampliada (produção, manutenção, qualidade, etc.)
ALTER TABLE knowledge_memory ADD COLUMN IF NOT EXISTS categoria TEXT;
CREATE INDEX IF NOT EXISTS idx_knowledge_memory_categoria ON knowledge_memory(company_id, categoria) WHERE categoria IS NOT NULL;
