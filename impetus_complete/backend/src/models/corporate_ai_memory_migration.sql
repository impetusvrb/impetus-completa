-- ============================================================================
-- IMPETUS - IA CORPORATIVA - MEMÓRIA E EVENTOS
-- Extensão da memória operacional: knowledge_memory, casos_manutencao, eventos_empresa
-- Claude (analítico) + ChatGPT (interação) - memória permanente da empresa
-- ============================================================================

-- 1. KNOWLEDGE_MEMORY - Memória organizacional permanente
CREATE TABLE IF NOT EXISTS knowledge_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  tipo_evento TEXT NOT NULL CHECK (tipo_evento IN (
    'tarefa', 'manutencao', 'falha', 'troca_peca', 'parada_maquina',
    'decisao', 'alerta', 'informacao', 'observacao'
  )),
  descricao TEXT NOT NULL,
  equipamento TEXT,
  linha TEXT,
  usuario TEXT,
  usuario_id UUID REFERENCES users(id) ON DELETE SET NULL,
  data TIMESTAMPTZ DEFAULT now(),
  tags TEXT[] DEFAULT '{}',

  source_type TEXT,
  source_id UUID,
  source_metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_memory_company ON knowledge_memory(company_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_memory_tipo ON knowledge_memory(company_id, tipo_evento);
CREATE INDEX IF NOT EXISTS idx_knowledge_memory_data ON knowledge_memory(company_id, data DESC);
CREATE INDEX IF NOT EXISTS idx_knowledge_memory_equipamento ON knowledge_memory(company_id, equipamento) WHERE equipamento IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_knowledge_memory_linha ON knowledge_memory(company_id, linha) WHERE linha IS NOT NULL;

-- 2. CASOS_MANUTENCAO - Casos resolvidos para aprendizado da IA
CREATE TABLE IF NOT EXISTS casos_manutencao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  equipamento TEXT,
  linha TEXT,
  problema TEXT NOT NULL,
  causa TEXT,
  solucao TEXT,
  peca_trocada TEXT,
  tempo_parada INTEGER,
  tecnico TEXT,
  tecnico_id UUID REFERENCES users(id) ON DELETE SET NULL,
  data TIMESTAMPTZ DEFAULT now(),

  work_order_id UUID,
  operational_event_id UUID,
  source_metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_casos_manutencao_company ON casos_manutencao(company_id);
CREATE INDEX IF NOT EXISTS idx_casos_manutencao_equipamento ON casos_manutencao(company_id, equipamento);
CREATE INDEX IF NOT EXISTS idx_casos_manutencao_data ON casos_manutencao(company_id, data DESC);

-- 3. EVENTOS_EMPRESA - Registro central de eventos (alimenta dashboards)
CREATE TABLE IF NOT EXISTS eventos_empresa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  tipo_evento TEXT NOT NULL,
  origem TEXT,
  equipamento TEXT,
  linha TEXT,
  descricao TEXT,
  data TIMESTAMPTZ DEFAULT now(),
  impacto TEXT,

  knowledge_memory_id UUID REFERENCES knowledge_memory(id) ON DELETE SET NULL,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_eventos_empresa_company ON eventos_empresa(company_id);
CREATE INDEX IF NOT EXISTS idx_eventos_empresa_tipo ON eventos_empresa(company_id, tipo_evento);
CREATE INDEX IF NOT EXISTS idx_eventos_empresa_data ON eventos_empresa(company_id, data DESC);

-- 4. TASKS - Adicionar colunas para lembretes automáticos
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS origem_conversa UUID;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_tasks_scheduled_pending 
  ON tasks(company_id, scheduled_at) 
  WHERE status != 'done' AND scheduled_at IS NOT NULL;

-- 5. AUDIO_MONITORING - Estrutura para ouvido sensível (perfil sonoro)
CREATE TABLE IF NOT EXISTS audio_machine_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  equipamento TEXT,
  linha TEXT,
  profile_data JSONB DEFAULT '{}',
  last_calibrated_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audio_detected_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  profile_id UUID REFERENCES audio_machine_profiles(id) ON DELETE SET NULL,
  event_type TEXT CHECK (event_type IN ('maquina_parada', 'maquina_reiniciada', 'mudanca_som', 'alarme')),
  equipamento TEXT,
  linha TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audio_events_company ON audio_detected_events(company_id);
CREATE INDEX IF NOT EXISTS idx_audio_events_created ON audio_detected_events(company_id, created_at DESC);
