-- ============================================================================
-- IMPETUS — Enterprise Hardening Bloco 9 (A9 / A10)
-- Immutability triggers para ledgers de auditoria
-- ============================================================================
-- Objetivo:
--   Tornar UPDATE / DELETE imediatamente rejeitados nas tabelas append-only de
--   auditoria. Aplicado APENAS se a tabela existir (idempotente, defensivo).
--   Não altera schema, não destrói dados.
--
-- Tabelas alvo (apenas se existirem):
--   • ai_decision_logs           (Conselho Cognitivo / governance)
--   • support_recovery_audit_events
--   • admin_portal_logs          (caso esteja em modo append-only no produto)
--
-- Política:
--   ROW LEVEL — qualquer UPDATE/DELETE lança exception com SQLSTATE 0L000
--   ('invalid_grantor' approximation; usamos RAISE EXCEPTION com SQLSTATE custom 'P0001').
--   Caller legítimo deve usar SOMENTE INSERT.
--
-- Compatibilidade:
--   • Roll-forward: idempotente (DROP TRIGGER IF EXISTS antes de CREATE).
--   • Rollback: ver _rollback/202605131_audit_immutability_triggers_rollback.sql
-- ============================================================================

DO $impetus_immutability$
DECLARE
  v_exists boolean;
BEGIN
  CREATE OR REPLACE FUNCTION impetus_audit_block_mutation()
  RETURNS trigger
  LANGUAGE plpgsql
  AS $fn$
  BEGIN
    RAISE EXCEPTION 'IMPETUS_AUDIT_IMMUTABLE: % rejeitada em %', TG_OP, TG_TABLE_NAME
      USING ERRCODE = 'P0001';
  END;
  $fn$;

  -- ai_decision_logs
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = current_schema() AND table_name = 'ai_decision_logs'
  ) INTO v_exists;
  IF v_exists THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trg_immutable_ai_decision_logs_update ON ai_decision_logs';
    EXECUTE 'DROP TRIGGER IF EXISTS trg_immutable_ai_decision_logs_delete ON ai_decision_logs';
    EXECUTE 'CREATE TRIGGER trg_immutable_ai_decision_logs_update
             BEFORE UPDATE ON ai_decision_logs
             FOR EACH ROW EXECUTE FUNCTION impetus_audit_block_mutation()';
    EXECUTE 'CREATE TRIGGER trg_immutable_ai_decision_logs_delete
             BEFORE DELETE ON ai_decision_logs
             FOR EACH ROW EXECUTE FUNCTION impetus_audit_block_mutation()';
  END IF;

  -- support_recovery_audit_events
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = current_schema() AND table_name = 'support_recovery_audit_events'
  ) INTO v_exists;
  IF v_exists THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trg_immutable_support_recovery_audit_update ON support_recovery_audit_events';
    EXECUTE 'DROP TRIGGER IF EXISTS trg_immutable_support_recovery_audit_delete ON support_recovery_audit_events';
    EXECUTE 'CREATE TRIGGER trg_immutable_support_recovery_audit_update
             BEFORE UPDATE ON support_recovery_audit_events
             FOR EACH ROW EXECUTE FUNCTION impetus_audit_block_mutation()';
    EXECUTE 'CREATE TRIGGER trg_immutable_support_recovery_audit_delete
             BEFORE DELETE ON support_recovery_audit_events
             FOR EACH ROW EXECUTE FUNCTION impetus_audit_block_mutation()';
  END IF;
END;
$impetus_immutability$;
