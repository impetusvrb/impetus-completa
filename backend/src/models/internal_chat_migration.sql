-- ============================================================================
-- IMPETUS COMUNICA IA - CHAT INTERNO ENTRE COLABORADORES
-- Módulo de comunicação tipo WhatsApp entre usuários da empresa
-- Criadores: Wellington Machado de Freitas & Gustavo Júnior da Silva
-- Registro INPI: BR512025007048-9 (30/11/2025)
-- ============================================================================
-- Rastreabilidade: Todas as mensagens são salvas para auditoria LGPD
-- Mídia: URLs apontam para Firebase Storage ou AWS S3
-- ============================================================================

-- Tabela de conversas (canais 1:1 ou futuros grupos)
CREATE TABLE IF NOT EXISTS internal_chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Participantes (para chat 1:1, participant_ids terá 2 usuários)
  participant_ids UUID[] NOT NULL,

  -- Tipo: 'direct' (1:1) ou 'group' (futuro)
  type TEXT NOT NULL DEFAULT 'direct' CHECK (type IN ('direct', 'group')),

  -- Nome do grupo (apenas para type='group')
  name TEXT,

  -- Última atividade (para ordenação)
  last_message_at TIMESTAMPTZ DEFAULT now(),

  -- Auditoria
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_internal_chat_conversations_company ON internal_chat_conversations(company_id);
CREATE INDEX idx_internal_chat_conversations_participants ON internal_chat_conversations USING GIN(participant_ids);
CREATE INDEX idx_internal_chat_conversations_last_message ON internal_chat_conversations(last_message_at DESC);

-- Tabela de mensagens (rastreabilidade completa)
CREATE TABLE IF NOT EXISTS internal_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES internal_chat_conversations(id) ON DELETE CASCADE,

  -- Remetente
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,

  -- Conteúdo
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'audio', 'video', 'image', 'document')),

  -- Texto (obrigatório para tipo text, opcional para mídia como legenda)
  text_content TEXT,

  -- Mídia: URL no Firebase Storage ou AWS S3
  media_url TEXT,
  media_filename TEXT,
  media_size_bytes BIGINT,
  media_duration_seconds INTEGER, -- para áudio/vídeo
  storage_provider TEXT, -- 'firebase' | 's3'

  -- Status
  status TEXT DEFAULT 'sent' CHECK (status IN ('sending', 'sent', 'delivered', 'read', 'failed')),

  -- Edição
  edited_at TIMESTAMPTZ,
  original_text_content TEXT, -- preserva texto original ao editar (auditoria)

  -- Exclusão (soft delete para auditoria)
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES users(id),

  -- Rastreabilidade e auditoria
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- IP e origem (auditoria)
  client_ip TEXT,
  source TEXT DEFAULT 'app' -- 'app' | 'web'
);

CREATE INDEX idx_internal_chat_messages_conversation ON internal_chat_messages(conversation_id);
CREATE INDEX idx_internal_chat_messages_sender ON internal_chat_messages(sender_id);
CREATE INDEX idx_internal_chat_messages_created ON internal_chat_messages(conversation_id, created_at DESC);
CREATE INDEX idx_internal_chat_messages_company ON internal_chat_messages(company_id);

-- Tabela de leitura (mensagens lidas)
CREATE TABLE IF NOT EXISTS internal_chat_read_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES internal_chat_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(message_id, user_id)
);

CREATE INDEX idx_internal_chat_read_receipts_message ON internal_chat_read_receipts(message_id);
CREATE INDEX idx_internal_chat_read_receipts_user ON internal_chat_read_receipts(user_id);
