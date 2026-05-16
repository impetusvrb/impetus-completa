-- WAVE 3 — Storage & Temporal Foundation (preparatório, aditivo)
-- NÃO altera eventos_empresa, operational_alerts, ai_decision_logs nem outras tabelas legadas.
-- NÃO executa create_hypertable. Partição apenas em tabelas NOVAS.

-- ---------------------------------------------------------------------------
-- Tiers de storage
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS impetus_storage_tier (
  tier_code TEXT PRIMARY KEY,
  description TEXT NOT NULL,
  latency_class TEXT NOT NULL DEFAULT 'hot',
  compression_policy TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO impetus_storage_tier (tier_code, description, latency_class, compression_policy)
VALUES
  ('hot', 'Dados quentes — consultas em tempo real', 'hot', 'none'),
  ('warm', 'Dados mornos — agregações e relatórios', 'warm', 'timescale_compress_planned'),
  ('cold', 'Arquivo object storage — raramente consultado', 'cold', 'external_parquet'),
  ('archive', 'Arquivo regulatório de longo prazo', 'archive', 'external_encrypted')
ON CONFLICT (tier_code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Políticas de retenção (declarativas; purge inactivo por defeito)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS impetus_retention_policy (
  policy_code TEXT PRIMARY KEY,
  hot_days INT NOT NULL DEFAULT 30,
  warm_days INT NOT NULL DEFAULT 180,
  cold_days INT NOT NULL DEFAULT 365,
  archive_days INT NULL,
  description TEXT NOT NULL,
  purge_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO impetus_retention_policy (policy_code, hot_days, warm_days, cold_days, archive_days, description)
VALUES
  ('default', 30, 180, 365, 2555, 'Perfil genérico'),
  ('telemetry', 7, 90, 365, 1825, 'Telemetria e séries temporais'),
  ('operational', 30, 180, 730, NULL, 'Eventos operacionais'),
  ('audit', 90, 365, 2555, 2555, 'Auditoria imutável — arquivo sem DELETE'),
  ('workflow', 14, 90, 365, NULL, 'Outbox/DLQ/replay')
ON CONFLICT (policy_code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Registo de tabelas candidatas (metadados; sem DDL em legado)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS impetus_storage_table_registry (
  logical_name TEXT PRIMARY KEY,
  physical_table TEXT NOT NULL,
  data_class TEXT NOT NULL,
  tier_code TEXT NOT NULL REFERENCES impetus_storage_tier (tier_code),
  retention_policy_code TEXT NOT NULL REFERENCES impetus_retention_policy (policy_code),
  partition_strategy TEXT NOT NULL DEFAULT 'none',
  partition_key TEXT NULL,
  timescale_candidate BOOLEAN NOT NULL DEFAULT false,
  telemetry_isolated BOOLEAN NOT NULL DEFAULT false,
  immutable_audit BOOLEAN NOT NULL DEFAULT false,
  convert_allowed BOOLEAN NOT NULL DEFAULT false,
  notes TEXT NULL,
  registered_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO impetus_storage_table_registry (
  logical_name, physical_table, data_class, tier_code, retention_policy_code,
  partition_strategy, partition_key, timescale_candidate, telemetry_isolated, immutable_audit, convert_allowed, notes
) VALUES
  ('company_events', 'eventos_empresa', 'operational', 'hot', 'operational', 'monthly', 'created_at', false, false, false, false, 'Legado — conversão apenas em janela futura offline'),
  ('operational_alerts', 'operational_alerts', 'operational', 'hot', 'operational', 'monthly', 'created_at', false, false, false, false, 'Legado'),
  ('ai_decision_audit', 'ai_decision_logs', 'audit', 'warm', 'audit', 'monthly', 'created_at', false, false, true, false, 'Triggers IMPETUS_AUDIT_IMMUTABLE — sem DROP'),
  ('ai_interaction_traces', 'ai_interaction_traces', 'audit', 'warm', 'audit', 'monthly', 'created_at', false, false, false, false, 'Legado'),
  ('system_metrics_legacy', 'system_metrics', 'telemetry', 'hot', 'telemetry', 'none', 'created_at', true, false, false, false, 'Coexistir com telemetry_timeseries_v1'),
  ('cognitive_event_backbone', 'cognitive_event_backbone', 'telemetry', 'warm', 'telemetry', 'weekly', 'created_at', true, false, false, false, 'WAVE 1 backbone'),
  ('industrial_outbox', 'industrial_event_outbox', 'workflow', 'hot', 'workflow', 'monthly', 'created_at', false, false, false, false, 'WAVE 1 outbox'),
  ('industrial_dlq', 'industrial_event_dlq', 'workflow', 'hot', 'workflow', 'monthly', 'created_at', false, false, false, false, 'WAVE 1 DLQ')
ON CONFLICT (logical_name) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Planos de particionamento (declarativos)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS impetus_partition_plan (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  logical_name TEXT NOT NULL REFERENCES impetus_storage_table_registry (logical_name),
  strategy TEXT NOT NULL,
  partition_key TEXT NOT NULL,
  premake_partitions INT NOT NULL DEFAULT 2,
  status TEXT NOT NULL DEFAULT 'planned',
  applied_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Planos de compressão (sem activar em legado)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS impetus_compression_plan (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  logical_name TEXT NOT NULL,
  tier_code TEXT NOT NULL REFERENCES impetus_storage_tier (tier_code),
  method TEXT NOT NULL,
  segment_by TEXT NULL,
  order_by TEXT NULL,
  status TEXT NOT NULL DEFAULT 'planned',
  notes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Timescale readiness (opt-in tracking)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS impetus_timescale_readiness (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  extension_installed BOOLEAN NOT NULL DEFAULT false,
  extension_version TEXT NULL,
  hypertable_autocreate_enabled BOOLEAN NOT NULL DEFAULT false,
  last_checked_at TIMESTAMPTZ NULL,
  last_error TEXT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO impetus_timescale_readiness (id, extension_installed, hypertable_autocreate_enabled)
VALUES (1, false, false)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Cold storage manifest (arquitectura; sem worker activo)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS impetus_cold_storage_manifest (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  logical_name TEXT NOT NULL,
  company_id UUID NULL,
  tier_code TEXT NOT NULL DEFAULT 'cold',
  storage_uri TEXT NOT NULL,
  format TEXT NOT NULL DEFAULT 'parquet',
  row_count_estimate BIGINT NULL,
  byte_size_estimate BIGINT NULL,
  checksum_sha256 TEXT NULL,
  time_range_start TIMESTAMPTZ NULL,
  time_range_end TIMESTAMPTZ NULL,
  status TEXT NOT NULL DEFAULT 'planned',
  exported_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cold_storage_manifest_logical
  ON impetus_cold_storage_manifest (logical_name, created_at DESC);

-- ---------------------------------------------------------------------------
-- Telemetria isolada (série temporal nova — não substitui system_metrics)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS telemetry_timeseries_v1 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  domain TEXT NOT NULL DEFAULT 'platform',
  metric_key TEXT NOT NULL,
  value DOUBLE PRECISION NOT NULL,
  unit TEXT NULL,
  labels JSONB NOT NULL DEFAULT '{}'::jsonb,
  recorded_at TIMESTAMPTZ NOT NULL,
  ingested_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_telemetry_ts_v1_company_recorded
  ON telemetry_timeseries_v1 (company_id, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_telemetry_ts_v1_domain_metric
  ON telemetry_timeseries_v1 (domain, metric_key, recorded_at DESC);

-- ---------------------------------------------------------------------------
-- Amostras industriais particionadas (ÚNICA tabela com PARTITION BY nesta wave)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS industrial_telemetry_samples (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  domain TEXT NOT NULL,
  metric_key TEXT NOT NULL,
  value DOUBLE PRECISION NULL,
  unit TEXT NULL,
  labels JSONB NOT NULL DEFAULT '{}'::jsonb,
  source TEXT NOT NULL DEFAULT 'ingest',
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ingested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id, recorded_at)
) PARTITION BY RANGE (recorded_at);

CREATE TABLE IF NOT EXISTS industrial_telemetry_samples_default
  PARTITION OF industrial_telemetry_samples
  FOR VALUES FROM (MINVALUE) TO (MAXVALUE);

CREATE INDEX IF NOT EXISTS idx_industrial_telemetry_samples_company_time
  ON industrial_telemetry_samples (company_id, recorded_at DESC);

-- ---------------------------------------------------------------------------
-- Rollups preparatórios (agregações futuras)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS industrial_metric_rollups_v1 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  domain TEXT NOT NULL,
  metric_key TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  window_end TIMESTAMPTZ NOT NULL,
  granularity TEXT NOT NULL,
  avg_value DOUBLE PRECISION NULL,
  min_value DOUBLE PRECISION NULL,
  max_value DOUBLE PRECISION NULL,
  sample_count BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, domain, metric_key, window_start, granularity)
);

CREATE INDEX IF NOT EXISTS idx_industrial_rollups_v1_lookup
  ON industrial_metric_rollups_v1 (company_id, metric_key, window_start DESC);

-- Registo das novas tabelas no registry
INSERT INTO impetus_storage_table_registry (
  logical_name, physical_table, data_class, tier_code, retention_policy_code,
  partition_strategy, partition_key, timescale_candidate, telemetry_isolated, immutable_audit, convert_allowed, notes
) VALUES
  ('telemetry_v1', 'telemetry_timeseries_v1', 'telemetry', 'hot', 'telemetry', 'monthly', 'recorded_at', true, true, false, true, 'WAVE 3 — ingestão isolada'),
  ('industrial_telemetry_samples', 'industrial_telemetry_samples', 'telemetry', 'hot', 'telemetry', 'weekly', 'recorded_at', true, true, false, true, 'WAVE 3 — particionada RANGE'),
  ('industrial_metric_rollups', 'industrial_metric_rollups_v1', 'telemetry', 'warm', 'telemetry', 'none', 'window_start', false, true, false, true, 'Agregações derivadas')
ON CONFLICT (logical_name) DO NOTHING;
