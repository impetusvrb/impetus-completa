-- ============================================================================
-- IMPETUS COMUNICA IA - MÓDULO CHAT COMPLETO (Especificação)
-- Tabelas: chat_conversations, chat_conversation_participants, chat_messages
-- Criadores: Wellington Machado de Freitas & Gustavo Júnior da Silva
-- Registro INPI: BR512025007048-9 (30/11/2025)
-- ============================================================================
-- Prefixo chat_ para evitar conflito com messages legado
-- ============================================================================

-- Tabela de conversas (private | group)
CREATE TABLE IF NOT EXISTS chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'private' CHECK (type IN ('private', 'group')),
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_chat_conversations_company ON chat_conversations(company_id);
CREATE INDEX idx_chat_conversations_type ON chat_conversations(type);

-- Participantes das conversas
CREATE TABLE IF NOT EXISTS chat_conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);

CREATE INDEX idx_chat_participants_conversation ON chat_conversation_participants(conversation_id);
CREATE INDEX idx_chat_participants_user ON chat_conversation_participants(user_id);

-- Mensagens (text | image | video | audio | document | ai)
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
  message_type TEXT NOT NULL DEFAULT 'text' 
    CHECK (message_type IN ('text', 'image', 'video', 'audio', 'document', 'ai')),
  content TEXT,
  file_url TEXT,
  file_name TEXT,
  file_size_bytes BIGINT,
  file_duration_seconds INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  read_at TIMESTAMPTZ,
  client_ip TEXT,
  source TEXT DEFAULT 'web'
);

CREATE INDEX idx_chat_messages_conversation ON chat_messages(conversation_id);
CREATE INDEX idx_chat_messages_sender ON chat_messages(sender_id);
CREATE INDEX idx_chat_messages_created ON chat_messages(conversation_id, created_at DESC);
CREATE INDEX idx_chat_messages_type ON chat_messages(message_type);

-- Reações (opcional)
CREATE TABLE IF NOT EXISTS chat_message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(message_id, user_id)
);

CREATE INDEX idx_chat_reactions_message ON chat_message_reactions(message_id);

-- Usuário especial Impetus IA (referência - criado via seed)
-- role: ai_system, name: Impetus IA
