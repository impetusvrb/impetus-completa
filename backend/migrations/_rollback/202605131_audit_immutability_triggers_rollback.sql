-- ============================================================================
-- IMPETUS — Rollback Audit Immutability (Bloco 9)
-- ============================================================================
-- Remove apenas os triggers; preserva a função utilitária. Idempotente.
-- ============================================================================

DROP TRIGGER IF EXISTS trg_immutable_ai_decision_logs_update ON ai_decision_logs;
DROP TRIGGER IF EXISTS trg_immutable_ai_decision_logs_delete ON ai_decision_logs;
DROP TRIGGER IF EXISTS trg_immutable_support_recovery_audit_update ON support_recovery_audit_events;
DROP TRIGGER IF EXISTS trg_immutable_support_recovery_audit_delete ON support_recovery_audit_events;
-- DROP FUNCTION IF EXISTS impetus_audit_block_mutation();  -- preserve for re-apply
