-- ============================================================================
-- IMPETUS - APP NOTIFICATIONS (Centro de Notificações)
-- Tabela de notificações in-app por utilizador, scoped por empresa (tenant).
-- Consumida por: notificationCenterService, unifiedMessagingService,
-- notificationFederationService, routes/operational.js.
-- Forward-only e idempotente.
-- ============================================================================

CREATE TABLE IF NOT EXISTS app_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  communication_id UUID REFERENCES communications(id) ON DELETE SET NULL,
  text_content TEXT NOT NULL,
  message_type VARCHAR(16) NOT NULL DEFAULT 'text',
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at TIMESTAMPTZ
);

-- Listagem por destinatário + tenant, ordenada por data (não lidas primeiro via WHERE).
CREATE INDEX IF NOT EXISTS idx_app_notifications_recipient
  ON app_notifications (recipient_id, company_id, sent_at DESC);

-- Contagem rápida de não lidas por destinatário.
CREATE INDEX IF NOT EXISTS idx_app_notifications_unread
  ON app_notifications (recipient_id, company_id)
  WHERE read_at IS NULL;

-- Auditoria por empresa.
CREATE INDEX IF NOT EXISTS idx_app_notifications_company
  ON app_notifications (company_id);
