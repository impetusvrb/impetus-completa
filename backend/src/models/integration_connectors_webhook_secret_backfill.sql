-- ============================================================================
-- Backfill: integration_connectors MES/ERP sem credencial em auth_config
-- Executar após lacunas_ind4_migration.sql. Idempotente (só preenche se faltar).
-- ============================================================================
UPDATE integration_connectors
SET auth_config = COALESCE(auth_config, '{}'::jsonb) || jsonb_build_object(
  'webhook_secret', encode(gen_random_bytes(32), 'hex')
)
WHERE connector_type = 'mes_erp'
  AND enabled = true
  AND NOT (COALESCE(auth_config, '{}'::jsonb) ? 'webhook_secret')
  AND NOT (COALESCE(auth_config, '{}'::jsonb) ? 'api_key');

-- Nota: após correr, revele o segredo apenas via UI/admin ou SELECT controlado;
-- o cliente MES deve passar o mesmo valor em X-Integration-Token.
