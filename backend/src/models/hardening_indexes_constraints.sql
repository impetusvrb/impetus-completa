-- IMPETUS Enterprise Hardening — Índices e constraints de segurança multi-tenant
-- Executar: psql -h 127.0.0.1 -U postgres -d impetus_db -f src/models/hardening_indexes_constraints.sql

-- Sem transacção — CREATE INDEX CONCURRENTLY requer auto-commit.
-- Cada statement é idempotente (IF NOT EXISTS).

-- 1. Índices company_id em tabelas sem cobertura
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_action_plans_5w2h_company ON action_plans_5w2h (company_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_incomplete_events_company ON ai_incomplete_events (company_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_proactive_alerts_company ON ai_proactive_alerts (company_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audio_machine_profiles_company ON audio_machine_profiles (company_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cert_readiness_audit_company ON certification_readiness_audit (company_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cert_readiness_snapshots_company ON certification_readiness_snapshots (company_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_consent_logs_company ON consent_logs (company_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dashboard_acessos_company ON dashboard_acessos (company_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dashboard_configs_company ON dashboard_configs (company_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_federation_auth_states_company ON federation_auth_states (company_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_final_consolidation_audit_company ON final_consolidation_audit (company_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_final_consolidation_snapshots_company ON final_consolidation_snapshots (company_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_manuals_company ON manuals (company_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mfa_challenges_company ON mfa_challenges (company_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_onboarding_conversations_company ON onboarding_conversations (company_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_proacao_rules_company ON proacao_rules (company_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_smart_reminders_company ON smart_reminders (company_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_mfa_enrollments_company ON user_mfa_enrollments (company_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_mfa_trusted_devices_company ON user_mfa_trusted_devices (company_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_mfa_backup_codes_company ON user_mfa_backup_codes (company_id);

-- 2. voice_preferences: adicionar company_id (isolamento por tenant)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='voice_preferences' AND column_name='company_id'
  ) THEN
    ALTER TABLE voice_preferences ADD COLUMN company_id UUID;
    UPDATE voice_preferences vp
    SET company_id = u.company_id
    FROM users u WHERE u.id = vp.user_id;
  END IF;
END $$;

-- 3. Índice composto para performance de queries scoped
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_company_created ON audit_logs (company_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_work_orders_company_status ON work_orders (company_id, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_company_status ON tasks (company_id, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_company_user ON notifications (company_id, user_id, created_at DESC);

-- 4. sessions: index para cleanup e validação
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_expires ON sessions (expires_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_user ON sessions (user_id);

-- 5. Constraint NOT NULL em users.company_id (NOT VALID = não bloqueia dados existentes)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name='users' AND constraint_name='chk_users_company_id_not_null'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT chk_users_company_id_not_null
      CHECK (company_id IS NOT NULL) NOT VALID;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
