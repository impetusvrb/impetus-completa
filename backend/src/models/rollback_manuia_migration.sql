-- ============================================================================
-- IMPETUS - ManuIA - Rollback (APENAS EM EMERGÊNCIA)
-- Atenção: Remove dados ManuIA. NÃO remove work_orders nem monitored_points
-- (podem ser usados por outros módulos)
-- ============================================================================
-- Execução: psql -f rollback_manuia_migration.sql
-- Ou: node -e "require('./src/db').query(require('fs').readFileSync('./src/models/rollback_manuia_migration.sql','utf8'))"
-- ============================================================================

DROP TABLE IF EXISTS manuia_work_order_links CASCADE;
DROP TABLE IF EXISTS manuia_history CASCADE;
DROP TABLE IF EXISTS manuia_equipment_research CASCADE;
DROP TABLE IF EXISTS manuia_emergency_events CASCADE;
DROP TABLE IF EXISTS manuia_sessions CASCADE;
DROP TABLE IF EXISTS manuia_sensors CASCADE;
DROP TABLE IF EXISTS manuia_machines CASCADE;
