-- SZ5 — Unified Operational Conversational Memory (PostgreSQL)

CREATE TABLE IF NOT EXISTS z_conversation_message_index (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  message_id UUID NOT NULL,
  thread_id UUID NOT NULL,
  sender_id UUID,
  index_record JSONB NOT NULL DEFAULT '{}',
  content_snapshot TEXT,
  indexed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, message_id)
);

CREATE INDEX IF NOT EXISTS idx_z5_msg_tenant_thread
  ON z_conversation_message_index (tenant_id, thread_id, indexed_at DESC);

CREATE INDEX IF NOT EXISTS idx_z5_msg_tenant_sender
  ON z_conversation_message_index (tenant_id, sender_id);

CREATE INDEX IF NOT EXISTS idx_z5_msg_content_fts
  ON z_conversation_message_index
  USING gin (to_tsvector('portuguese', COALESCE(content_snapshot, '')));

CREATE TABLE IF NOT EXISTS z_operational_memory_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  from_ref TEXT NOT NULL,
  to_ref TEXT NOT NULL,
  link_type TEXT NOT NULL DEFAULT 'related',
  weight NUMERIC(4,2) NOT NULL DEFAULT 1,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_z5_links_tenant
  ON z_operational_memory_links (tenant_id, link_type);
