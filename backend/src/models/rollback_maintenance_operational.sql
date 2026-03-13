-- ============================================================================
-- ROLLBACK - Camada Operacional de Manutenção
-- Remove APENAS as tabelas criadas por maintenance_operational_migration.sql
-- Execute manualmente se precisar reverter: node -e "require('./src/db').query(require('fs').readFileSync('./src/models/rollback_maintenance_operational.sql','utf8'))"
-- ============================================================================

-- Ordem: remover dependentes primeiro (por causa das foreign keys)
DROP TABLE IF EXISTS shift_technical_logs CASCADE;
DROP TABLE IF EXISTS equipment_failures CASCADE;
DROP TABLE IF EXISTS technical_interventions CASCADE;
DROP TABLE IF EXISTS maintenance_preventives CASCADE;
DROP TABLE IF EXISTS work_orders CASCADE;
DROP TABLE IF EXISTS monitored_points CASCADE;

-- Remover coluna work_order_created de machine_detected_events (se existir)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'machine_detected_events' AND column_name = 'work_order_created') THEN
    ALTER TABLE machine_detected_events DROP COLUMN work_order_created;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
