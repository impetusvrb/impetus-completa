-- ============================================================================
-- IMPETUS - ONBOARDING INTELIGENTE + MEMÓRIA PERSISTENTE
-- Tabelas para entrevista estratégica e memória adaptativa
-- ============================================================================

-- 1) Memória da empresa (coletada no primeiro acesso do admin)
CREATE TABLE IF NOT EXISTS memoria_empresa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL UNIQUE REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Conteúdo coletado (respostas brutas da entrevista)
  respostas_raw JSONB DEFAULT '[]',
  
  -- Perfis gerados pela IA
  perfil_estrategico JSONB DEFAULT '{}',
  resumo_executivo TEXT,
  mapa_riscos JSONB DEFAULT '[]',
  resumo_operacional TEXT,
  resumo_cultural TEXT,
  
  -- Controle
  onboarding_completed BOOLEAN DEFAULT false,
  last_context_update TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT memoria_empresa_company_unique UNIQUE (company_id)
);

CREATE INDEX IF NOT EXISTS idx_memoria_empresa_company ON memoria_empresa(company_id);
CREATE INDEX IF NOT EXISTS idx_memoria_empresa_onboarding ON memoria_empresa(onboarding_completed) WHERE onboarding_completed = false;

-- 2) Memória do usuário (coletada no primeiro acesso individual)
CREATE TABLE IF NOT EXISTS memoria_usuario (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Conteúdo coletado
  respostas_raw JSONB DEFAULT '[]',
  
  -- Perfis gerados pela IA
  perfil_tecnico JSONB DEFAULT '{}',
  perfil_comportamental JSONB DEFAULT '{}',
  mapa_responsabilidade JSONB DEFAULT '{}',
  mapa_influencia JSONB DEFAULT '{}',
  resumo_estrategico TEXT,
  
  -- Controle
  onboarding_completed BOOLEAN DEFAULT false,
  last_context_update TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT memoria_usuario_user_unique UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_memoria_usuario_user ON memoria_usuario(user_id);
CREATE INDEX IF NOT EXISTS idx_memoria_usuario_company ON memoria_usuario(company_id);
CREATE INDEX IF NOT EXISTS idx_memoria_usuario_onboarding ON memoria_usuario(onboarding_completed) WHERE onboarding_completed = false;

-- 3) Histórico da entrevista (mensagens trocadas)
CREATE TABLE IF NOT EXISTS onboarding_conversa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL, -- 'empresa' | 'usuario'
  
  "role" TEXT NOT NULL, -- 'assistant' | 'user'
  content TEXT NOT NULL,
  
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_onboarding_conversa_lookup ON onboarding_conversa(company_id, user_id, tipo);

COMMENT ON TABLE memoria_empresa IS 'Memória estratégica da empresa - onboarding do admin';
COMMENT ON TABLE memoria_usuario IS 'Memória individual - onboarding por usuário';
COMMENT ON TABLE onboarding_conversa IS 'Histórico da entrevista de onboarding';
