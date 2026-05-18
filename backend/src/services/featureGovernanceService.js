'use strict';

/**
 * IMPETUS — Feature Governance Service (Enterprise Hardening Bloco 11)
 *
 * Responsabilidades:
 *   1. Snapshot imutável das flags relevantes no arranque (boot).
 *   2. Validação de combinações inválidas conhecidas (ex.: pipeline strict
 *      sem orquestrador habilitado).
 *   3. Cache do snapshot — leituras em hot path não recorrem ao env.
 *   4. Dependency graph mínimo (declarativo) que pode crescer no tempo.
 *
 * Aditivo: não substitui os reads de `process.env` existentes. É um
 * **observador** que produz relatório / aviso no boot. Consumidores podem
 * optar por consultar `getFlag(name)` em vez de `process.env` quando
 * quiserem comportamento cacheado.
 */

const KNOWN_FLAGS = [
  // Hardening blocos 1–12
  'IMPETUS_INTERNAL_ROUTES_ENABLED',
  'IMPETUS_INTERNAL_ROUTES_DEV_OPEN',
  'IMPETUS_INTERNAL_IP_ALLOWLIST',
  'IMPETUS_INTERNAL_ROUTE_CIDR_ALLOWLIST',
  'IMPETUS_INTERNAL_ROUTE_ALLOW_LOCALHOST',
  'IMPETUS_INTERNAL_ROUTE_DENY_BY_DEFAULT',
  'IMPETUS_INTERNAL_ROUTE_TRUST_PROXY',
  'IMPETUS_TRUSTED_PROXY_CIDRS',
  'IMPETUS_INTERNAL_NETWORK_DEV_BYPASS',
  'IMPETUS_ALLOW_TOKEN_IN_QUERY',
  'IMPETUS_STRICT_TENANT_FROM_DB',
  'IMPETUS_LOGIN_REQUIRE_SESSION_PERSISTENCE',
  'IMPETUS_JWT_FAIL_CLOSED_PLACEHOLDER',
  'IMPETUS_MIGRATION_ADVISORY_LOCK',
  'IMPETUS_MIGRATION_LOCK_TIMEOUT_MS',
  'IMPETUS_MIGRATION_LOCK_NAMESPACE',
  'IMPETUS_ALLOW_DESTRUCTIVE_MIGRATIONS',
  'IMPETUS_ALLOW_PARTIAL_ENV',
  // Pipeline cognitivo (existentes)
  'IMPETUS_STRICT_AI_PIPELINE',
  'IMPETUS_ENFORCE_AI_ORCHESTRATOR_GATE',
  'IMPETUS_ENFORCE_GEMINI_INGRESS',
  'IMPETUS_ENFORCE_GEMINI_INGRESS_GLOBAL',
  'IMPETUS_GEMINI_INGRESS_ENABLED',
  'UNIFIED_DECISION_ENGINE',
  'UNIFIED_DECISION_USE_TRIADE',
  'USE_DECISION_FACADE',
  // Contextual / Motor A/B
  'IMPETUS_CONTEXTUAL_MODULES',
  'IMPETUS_CONTEXTUAL_SYSTEM_ADMIN',
  'IMPETUS_DASHBOARD_ENGINE_V2',
  'IMPETUS_GOVERNANCE_ENABLED',
  'IMPETUS_EVENT_PIPELINE_ENABLED',
  'IMPETUS_EVENT_PIPELINE_SHADOW',
  // WAVE 1 — backbone industrial
  'IMPETUS_INDUSTRIAL_EVENTS_ENABLED',
  'IMPETUS_INDUSTRIAL_OUTBOX_ENABLED',
  'IMPETUS_INDUSTRIAL_DLQ_ENABLED',
  'IMPETUS_INDUSTRIAL_REPLAY_SHADOW',
  'IMPETUS_EVENT_CATALOG_STRICT',
  'IMPETUS_EVENT_THROTTLE_PER_TENANT',
  // WAVE 2 — observabilidade enterprise
  'IMPETUS_OBSERVABILITY_V2_ENABLED',
  'IMPETUS_WORKFLOW_TRACING_ENABLED',
  'IMPETUS_CORRELATION_PROPAGATION_ENABLED',
  'IMPETUS_OTEL_EXPORTER_ENABLED',
  'IMPETUS_OTEL_ENDPOINT',
  'IMPETUS_PROMETHEUS_ENDPOINT_ENABLED',
  'IMPETUS_TENANT_METRICS_CARDINALITY_CAP',
  'IMPETUS_SLO_MONITORING_ENABLED',
  'IMPETUS_SATURATION_MONITORING_ENABLED',
  'IMPETUS_EVENT_LAG_MONITORING_ENABLED',
  'IMPETUS_DLQ_MONITORING_ENABLED',
  'IMPETUS_COGNITIVE_PRESSURE_OBS_ENABLED',
  'IMPETUS_WORKFLOW_OBSERVABILITY_ENABLED',
  'IMPETUS_OBSERVABILITY_ALERTS_ENFORCE',
  // WAVE 3 — storage temporal
  'IMPETUS_STORAGE_V3_ENABLED',
  'IMPETUS_TIMESCALE_ENABLED',
  'IMPETUS_TIMESCALE_PREPARE_EXTENSION',
  'IMPETUS_PARTITIONING_STRATEGY',
  'IMPETUS_COLD_STORAGE_ENABLED',
  'IMPETUS_RETENTION_PROFILE',
  'IMPETUS_TELEMETRY_ISOLATED_INGEST_ENABLED',
  'IMPETUS_PARTITION_MAINTENANCE_ENABLED',
  'IMPETUS_RETENTION_PURGE_ENABLED',
  // WAVE 4 — contexto cognitivo seguro
  'IMPETUS_AI_CONTEXT_BUDGET_ENABLED',
  'IMPETUS_AI_SUMMARIZER_ENABLED',
  'IMPETUS_AI_AUTOLOOP_GUARD',
  'IMPETUS_AI_AUTOLOOP_GUARD_ENFORCE',
  'IMPETUS_AI_AUTOLOOP_MAX_DEPTH',
  'IMPETUS_AI_TOKEN_QUOTA_PER_TENANT',
  'IMPETUS_AI_SATURATION_PROTECTION_ENABLED',
  'IMPETUS_AI_TOKEN_GOVERNANCE_ENFORCE',
  // WAVE 5 — bounded contexts
  'IMPETUS_DOMAINS_V5_ENABLED',
  'IMPETUS_DOMAIN_ISOLATION_STRICT',
  // Quality universal runtime (dual-layer; default off)
  'IMPETUS_QUALITY_UNIVERSAL_RUNTIME_ENABLED',
  'IMPETUS_QUALITY_UNIVERSAL_SHADOW_MODE',
  // Quality operational UX runtime (etapa mobile/offline; default off)
  'IMPETUS_QUALITY_OPERATIONAL_RUNTIME_ENABLED',
  'IMPETUS_QUALITY_OFFLINE_RUNTIME_ENABLED',
  'IMPETUS_QUALITY_SCANNER_RUNTIME_ENABLED',
  'IMPETUS_QUALITY_REALTIME_COLLECTION_ENABLED',
  'IMPETUS_QUALITY_KIOSK_RUNTIME_ENABLED',
  'IMPETUS_QUALITY_ATTACHMENT_RUNTIME_ENABLED',
  'IMPETUS_QUALITY_GOVERNANCE_RUNTIME_ENABLED',
  'IMPETUS_QUALITY_SPC_RUNTIME_ENABLED',
  'IMPETUS_QUALITY_CAPA_INTELLIGENCE_ENABLED',
  'IMPETUS_QUALITY_SUPPLIER_ANALYTICS_ENABLED',
  'IMPETUS_QUALITY_RISK_INTELLIGENCE_ENABLED',
  'IMPETUS_QUALITY_EXECUTIVE_EXPLAINABILITY_ENABLED',
  'IMPETUS_QUALITY_EXECUTIVE_DASHBOARDS_ENABLED',
  'IMPETUS_QUALITY_AI_ASSISTANCE_ENABLED',
  'IMPETUS_QUALITY_TELEMETRY_RUNTIME_ENABLED',
  'IMPETUS_QUALITY_TELEMETRY_BACKBONE_EVENTS_ENABLED',
  'IMPETUS_QUALITY_TELEMETRY_RANGE_EVENTS_ENABLED',
  'IMPETUS_QUALITY_TELEMETRY_SAMPLE_RATIO',
  'IMPETUS_QUALITY_TELEMETRY_BATCH_MAX',
  'IMPETUS_QUALITY_TELEMETRY_PRIMARY_TABLE',
  'IMPETUS_QUALITY_COGNITIVE_RUNTIME_ENABLED',
  'IMPETUS_QUALITY_DRIFT_PREDICTION_ENABLED',
  'IMPETUS_QUALITY_RECURRENCE_ANALYSIS_ENABLED',
  'IMPETUS_QUALITY_SUPPLIER_SCORING_ENABLED',
  'IMPETUS_QUALITY_ANOMALY_PREDICTION_ENABLED',
  'IMPETUS_QUALITY_PROCESS_DETERIORATION_ENABLED',
  'IMPETUS_QUALITY_CONTEXTUAL_RECOMMENDATIONS_ENABLED',
  'IMPETUS_QUALITY_EXECUTIVE_NARRATIVES_ENABLED',
  'IMPETUS_QUALITY_COGNITIVE_PUBLISH_EVENTS_ENABLED',
  'IMPETUS_QUALITY_ROLLOUT_RUNTIME_ENABLED',
  'IMPETUS_QUALITY_TENANT_ROLLOUT_ENABLED',
  'IMPETUS_QUALITY_PLANT_ROLLOUT_ENABLED',
  'IMPETUS_QUALITY_WORKFLOW_ROLLOUT_ENABLED',
  'IMPETUS_QUALITY_MATURITY_SCORING_ENABLED',
  'IMPETUS_QUALITY_ADOPTION_ANALYTICS_ENABLED',
  'IMPETUS_QUALITY_SATURATION_PROTECTION_ENABLED',
  'IMPETUS_QUALITY_READINESS_ENGINE_ENABLED',
  'IMPETUS_QUALITY_ROLLOUT_PUBLISH_EVENTS_ENABLED',
  'IMPETUS_QUALITY_NAVIGATION_RUNTIME_ENABLED',
  'IMPETUS_QUALITY_PUBLICATION_RUNTIME_ENABLED',
  'IMPETUS_QUALITY_PUBLICATION_SHADOW_MODE',
  'IMPETUS_QUALITY_PUBLICATION_AUDIENCE_PREVIEW',
  'IMPETUS_QUALITY_ACTIVATION_STAGE',
  // SAFETY / SST — Universal Occupational Safety Management Core
  'IMPETUS_SAFETY_OPERATIONAL_RUNTIME_ENABLED',
  'IMPETUS_SAFETY_OFFLINE_RUNTIME_ENABLED',
  'IMPETUS_SAFETY_KIOSK_RUNTIME_ENABLED',
  'IMPETUS_SAFETY_GOVERNANCE_RUNTIME_ENABLED',
  'IMPETUS_SAFETY_RISK_MATRIX_ENABLED',
  'IMPETUS_SAFETY_GHE_RUNTIME_ENABLED',
  'IMPETUS_SAFETY_COMPLIANCE_RUNTIME_ENABLED',
  'IMPETUS_SAFETY_TELEMETRY_RUNTIME_ENABLED',
  'IMPETUS_SAFETY_COGNITIVE_RUNTIME_ENABLED',
  'IMPETUS_SAFETY_ROLLOUT_RUNTIME_ENABLED',
  'IMPETUS_SAFETY_NAVIGATION_RUNTIME_ENABLED',
  'IMPETUS_SAFETY_PUBLICATION_RUNTIME_ENABLED',
  'IMPETUS_SAFETY_PUBLICATION_SHADOW_MODE',
  'IMPETUS_SAFETY_PUBLICATION_AUDIENCE_PREVIEW',
  'IMPETUS_SAFETY_ACTIVATION_STAGE',
  // LOGISTICS — WMS/TMS enterprise runtime alignment
  'IMPETUS_LOGISTICS_OPERATIONAL_RUNTIME_ENABLED',
  'IMPETUS_LOGISTICS_OFFLINE_RUNTIME_ENABLED',
  'IMPETUS_LOGISTICS_RF_RUNTIME_ENABLED',
  'IMPETUS_LOGISTICS_KIOSK_RUNTIME_ENABLED',
  'IMPETUS_LOGISTICS_GOVERNANCE_RUNTIME_ENABLED',
  'IMPETUS_LOGISTICS_TELEMETRY_RUNTIME_ENABLED',
  'IMPETUS_LOGISTICS_COGNITIVE_RUNTIME_ENABLED',
  'IMPETUS_LOGISTICS_ROLLOUT_RUNTIME_ENABLED',
  'IMPETUS_LOGISTICS_NAVIGATION_RUNTIME_ENABLED',
  'IMPETUS_LOGISTICS_PUBLICATION_RUNTIME_ENABLED',
  'IMPETUS_LOGISTICS_PUBLICATION_SHADOW_MODE',
  'IMPETUS_LOGISTICS_PUBLICATION_AUDIENCE_PREVIEW',
  'IMPETUS_LOGISTICS_ACTIVATION_STAGE',
  // ENVIRONMENT — SGA/EHS enterprise runtime alignment
  'IMPETUS_ENVIRONMENT_OPERATIONAL_RUNTIME_ENABLED',
  'IMPETUS_ENVIRONMENT_GOVERNANCE_RUNTIME_ENABLED',
  'IMPETUS_ENVIRONMENT_TELEMETRY_RUNTIME_ENABLED',
  'IMPETUS_ENVIRONMENT_TELEMETRY_BACKBONE_EVENTS_ENABLED',
  'IMPETUS_ENVIRONMENT_TELEMETRY_THRESHOLD_EVENTS_ENABLED',
  'IMPETUS_ENVIRONMENT_TELEMETRY_DRIFT_EVENTS_ENABLED',
  'IMPETUS_ENVIRONMENT_TELEMETRY_EDGE_ENABLED',
  'IMPETUS_ENVIRONMENT_TELEMETRY_MQTT_ENABLED',
  'IMPETUS_ENVIRONMENT_TELEMETRY_OPCUA_ENABLED',
  'IMPETUS_ENVIRONMENT_TELEMETRY_MODBUS_ENABLED',
  'IMPETUS_ENVIRONMENT_COGNITIVE_RUNTIME_ENABLED',
  'IMPETUS_ENVIRONMENT_PREDICTION_ENABLED',
  'IMPETUS_ENVIRONMENT_CROSS_DOMAIN_CORRELATION_ENABLED',
  'IMPETUS_ENVIRONMENT_CONTEXTUAL_RECOMMENDATIONS_ENABLED',
  'IMPETUS_ENVIRONMENT_EXPLAINABILITY_ENABLED',
  'IMPETUS_ENVIRONMENT_NARRATIVES_ENABLED',
  'IMPETUS_ENVIRONMENT_COGNITIVE_PUBLISH_EVENTS_ENABLED',
  'IMPETUS_ENVIRONMENT_IOT_RUNTIME_ENABLED',
  'IMPETUS_ENVIRONMENT_ROLLOUT_RUNTIME_ENABLED',
  'IMPETUS_ENVIRONMENT_NAVIGATION_RUNTIME_ENABLED',
  'IMPETUS_ENVIRONMENT_PUBLICATION_RUNTIME_ENABLED',
  'IMPETUS_ENVIRONMENT_PUBLICATION_SHADOW_MODE',
  'IMPETUS_ENVIRONMENT_PUBLICATION_AUDIENCE_PREVIEW',
  'IMPETUS_ENVIRONMENT_ACTIVATION_STAGE',
  'IMPETUS_ENVIRONMENT_OPERATIONAL_RUNTIME_ENABLED',
  'IMPETUS_ENVIRONMENT_OFFLINE_RUNTIME_ENABLED',
  'IMPETUS_ENVIRONMENT_SCANNER_RUNTIME_ENABLED',
  'IMPETUS_ENVIRONMENT_REALTIME_RUNTIME_ENABLED',
  'IMPETUS_ENVIRONMENT_MOBILE_RUNTIME_ENABLED',
  'IMPETUS_ENVIRONMENT_ATTACHMENT_RUNTIME_ENABLED',
  'IMPETUS_ENVIRONMENT_KIOSK_RUNTIME_ENABLED',
  'IMPETUS_ENVIRONMENT_GOVERNANCE_RUNTIME_ENABLED',
  'IMPETUS_ENVIRONMENT_ESG_RUNTIME_ENABLED',
  'IMPETUS_ENVIRONMENT_COMPLIANCE_RUNTIME_ENABLED',
  'IMPETUS_ENVIRONMENT_CARBON_RUNTIME_ENABLED',
  'IMPETUS_ENVIRONMENT_ENERGY_RUNTIME_ENABLED',
  'IMPETUS_ENVIRONMENT_SUSTAINABILITY_RUNTIME_ENABLED',
  'IMPETUS_ENVIRONMENT_EXECUTIVE_INTELLIGENCE_ENABLED',
  'IMPETUS_ENVIRONMENT_EXECUTIVE_RUNTIME_ENABLED',
  'IMPETUS_ENVIRONMENT_EXECUTIVE_ESG_COCKPIT_ENABLED',
  'IMPETUS_ENVIRONMENT_EXECUTIVE_SUSTAINABILITY_ENABLED',
  'IMPETUS_ENVIRONMENT_EXECUTIVE_CARBON_ANALYTICS_ENABLED',
  'IMPETUS_ENVIRONMENT_EXECUTIVE_HEATMAPS_ENABLED',
  'IMPETUS_ENVIRONMENT_EXECUTIVE_RISK_MAPS_ENABLED',
  'IMPETUS_ENVIRONMENT_EXECUTIVE_INTELLIGENCE_CENTER_ENABLED',
  'IMPETUS_ENVIRONMENT_EXECUTIVE_PUBLISH_EVENTS_ENABLED',
  'IMPETUS_ENVIRONMENT_AI_ASSISTANCE_ENABLED',
  // WAVE 7 — governança industrial
  'IMPETUS_GOVERNANCE_V7_ENABLED',
  'IMPETUS_ABAC_ENFORCE',
  'IMPETUS_INDUSTRIAL_AUDIT_ENABLED',
  'IMPETUS_AUDIT_HASH_CHAIN_ENABLED',
  'IMPETUS_LGPD_CLASSIFICATION_ENABLED',
  'IMPETUS_TRACEABILITY_ENABLED',
  'IMPETUS_WORKFLOW_CAPABILITY_MATRIX_ENABLED',
  'IMPETUS_WORKFLOW_PERMISSION_ENFORCE',
  'IMPETUS_DOMAIN_CAPABILITY_GOVERNANCE_ENABLED',
  // Enterprise authority
  'IMPETUS_COGNITIVE_AUTHORITY_ROUTER_ENABLED',
  'AI_POLICY_ENGINE_ENABLED',
  // Support recovery
  'IMPETUS_SUPPORT_RECOVERY_ENABLED',
  // Observabilidade
  'SYSTEM_METRICS_CRON_ENABLED',
  'OPERATIONAL_BRAIN_CRON_ENABLED',
  'DATA_LIFECYCLE_CRON_ENABLED',
  'ENABLE_NEXUS_TOKEN_BILLING_CRON',
  // Auth
  'JWT_SECRET',
  'IMPETUS_ADMIN_JWT_SECRET',
  'ALLOWED_ORIGINS',
  // Plataforma
  'NODE_ENV',
  'PORT'
];

const SENSITIVE_FLAGS = new Set([
  'JWT_SECRET',
  'IMPETUS_ADMIN_JWT_SECRET',
  'HEALTH_DETAIL_KEY'
]);

/**
 * Regras declarativas de combinação inválida.
 * Cada regra: { id, severity: 'error'|'warn', when: () => boolean, message: string }
 * Não bloqueia o boot por defeito — apenas regista. Em produção, severidade
 * 'error' poderá ser amplificada por process.exit no futuro (gate aditivo).
 */
const RULES = [
  {
    id: 'STRICT_AI_PIPELINE_REQUIRES_GATE',
    severity: 'warn',
    when: () =>
      String(process.env.IMPETUS_STRICT_AI_PIPELINE || '').toLowerCase() === 'true' &&
      String(process.env.IMPETUS_ENFORCE_AI_ORCHESTRATOR_GATE || '').toLowerCase() === 'false',
    message:
      'STRICT_AI_PIPELINE=true sem ENFORCE_AI_ORCHESTRATOR_GATE — gate efectivo pode não ser aplicado.'
  },
  {
    id: 'INTERNAL_DEV_OPEN_IN_PROD',
    severity: 'error',
    when: () =>
      String(process.env.NODE_ENV || '').toLowerCase() === 'production' &&
      String(process.env.IMPETUS_INTERNAL_ROUTES_DEV_OPEN || '').toLowerCase() === 'true',
    message:
      'IMPETUS_INTERNAL_ROUTES_DEV_OPEN=true em produção — rotas internas seriam acessíveis sem auth. Corrija imediatamente.'
  },
  {
    id: 'ALLOW_TOKEN_IN_QUERY_IN_PROD',
    severity: 'warn',
    when: () =>
      String(process.env.NODE_ENV || '').toLowerCase() === 'production' &&
      String(process.env.IMPETUS_ALLOW_TOKEN_IN_QUERY || '').toLowerCase() === 'true',
    message:
      'IMPETUS_ALLOW_TOKEN_IN_QUERY=true em produção — tokens podem vazar via logs / Referer.'
  },
  {
    id: 'STRICT_TENANT_DISABLED',
    severity: 'warn',
    when: () =>
      String(process.env.IMPETUS_STRICT_TENANT_FROM_DB || 'true').toLowerCase() === 'false',
    message:
      'IMPETUS_STRICT_TENANT_FROM_DB=false — JWT pode preencher company_id ausente na BD (vetor multi-tenant).'
  },
  {
    id: 'CONTEXTUAL_REPLACE_WITHOUT_FALLBACK',
    severity: 'warn',
    when: () =>
      String(process.env.IMPETUS_CONTEXTUAL_MODULES || '').toLowerCase() === 'replace',
    message:
      'IMPETUS_CONTEXTUAL_MODULES=replace activo — confirme que registry cobre todos os perfis ou activará "apagão" para utilizadores não mapeados.'
  },
  {
    id: 'EVENT_PIPELINE_SHADOW_WITHOUT_ENABLED',
    severity: 'warn',
    when: () =>
      String(process.env.IMPETUS_EVENT_PIPELINE_SHADOW || '').toLowerCase() === 'true' &&
      String(process.env.IMPETUS_EVENT_PIPELINE_ENABLED || '').toLowerCase() !== 'true',
    message:
      'IMPETUS_EVENT_PIPELINE_SHADOW=true sem IMPETUS_EVENT_PIPELINE_ENABLED=true — shadow não é amostrado.'
  },
  {
    id: 'INDUSTRIAL_OUTBOX_WITHOUT_EVENTS',
    severity: 'warn',
    when: () =>
      String(process.env.IMPETUS_INDUSTRIAL_OUTBOX_ENABLED || '').toLowerCase() === 'true' &&
      String(process.env.IMPETUS_INDUSTRIAL_EVENTS_ENABLED || '').toLowerCase() !== 'true',
    message:
      'IMPETUS_INDUSTRIAL_OUTBOX_ENABLED=true sem IMPETUS_INDUSTRIAL_EVENTS_ENABLED — outbox industrial inerte.'
  },
  {
    id: 'INDUSTRIAL_DLQ_WITHOUT_OUTBOX',
    severity: 'warn',
    when: () =>
      String(process.env.IMPETUS_INDUSTRIAL_DLQ_ENABLED || '').toLowerCase() === 'true' &&
      String(process.env.IMPETUS_INDUSTRIAL_OUTBOX_ENABLED || '').toLowerCase() !== 'true',
    message:
      'IMPETUS_INDUSTRIAL_DLQ_ENABLED=true sem outbox — DLQ só recebe via memória/shadow.'
  },
  {
    id: 'EVENT_CATALOG_STRICT_WITHOUT_EVENTS',
    severity: 'warn',
    when: () =>
      String(process.env.IMPETUS_EVENT_CATALOG_STRICT || '').toLowerCase() === 'true' &&
      String(process.env.IMPETUS_INDUSTRIAL_EVENTS_ENABLED || '').toLowerCase() !== 'true',
    message:
      'IMPETUS_EVENT_CATALOG_STRICT=true sem eventos industriais ligados — strict não tem efeito.'
  },
  {
    id: 'OTEL_WITHOUT_V2',
    severity: 'warn',
    when: () =>
      String(process.env.IMPETUS_OTEL_EXPORTER_ENABLED || '').toLowerCase() === 'true' &&
      String(process.env.IMPETUS_OBSERVABILITY_V2_ENABLED || '').toLowerCase() !== 'true',
    message: 'IMPETUS_OTEL_EXPORTER_ENABLED=true sem OBSERVABILITY_V2 — export inerte.'
  },
  {
    id: 'OTEL_WITHOUT_ENDPOINT',
    severity: 'warn',
    when: () =>
      String(process.env.IMPETUS_OTEL_EXPORTER_ENABLED || '').toLowerCase() === 'true' &&
      !String(process.env.IMPETUS_OTEL_ENDPOINT || '').trim(),
    message: 'IMPETUS_OTEL_EXPORTER_ENABLED=true sem IMPETUS_OTEL_ENDPOINT.'
  },
  {
    id: 'WORKFLOW_TRACING_WITHOUT_V2',
    severity: 'warn',
    when: () =>
      String(process.env.IMPETUS_WORKFLOW_TRACING_ENABLED || '').toLowerCase() === 'true' &&
      String(process.env.IMPETUS_OBSERVABILITY_V2_ENABLED || '').toLowerCase() !== 'true',
    message: 'WORKFLOW_TRACING sem OBSERVABILITY_V2 — tracing inerte.'
  },
  {
    id: 'TIMESCALE_WITHOUT_STORAGE_V3',
    severity: 'warn',
    when: () =>
      String(process.env.IMPETUS_TIMESCALE_ENABLED || '').toLowerCase() === 'true' &&
      String(process.env.IMPETUS_STORAGE_V3_ENABLED || '').toLowerCase() !== 'true',
    message: 'IMPETUS_TIMESCALE_ENABLED sem STORAGE_V3 — Timescale inerte.'
  },
  {
    id: 'RETENTION_PURGE_WITHOUT_V3',
    severity: 'error',
    when: () =>
      String(process.env.IMPETUS_RETENTION_PURGE_ENABLED || '').toLowerCase() === 'true' &&
      String(process.env.IMPETUS_STORAGE_V3_ENABLED || '').toLowerCase() !== 'true',
    message: 'RETENTION_PURGE sem STORAGE_V3 — perigoso; desligue RETENTION_PURGE.'
  },
  {
    id: 'TELEMETRY_INGEST_WITHOUT_V3',
    severity: 'warn',
    when: () =>
      String(process.env.IMPETUS_TELEMETRY_ISOLATED_INGEST_ENABLED || '').toLowerCase() === 'true' &&
      String(process.env.IMPETUS_STORAGE_V3_ENABLED || '').toLowerCase() !== 'true',
    message: 'TELEMETRY_ISOLATED_INGEST sem STORAGE_V3 — ingest inerte.'
  },
  {
    id: 'SUMMARIZER_WITHOUT_CONTEXT_BUDGET',
    severity: 'warn',
    when: () =>
      String(process.env.IMPETUS_AI_SUMMARIZER_ENABLED || '').toLowerCase() === 'true' &&
      String(process.env.IMPETUS_AI_CONTEXT_BUDGET_ENABLED || '').toLowerCase() !== 'true',
    message: 'IMPETUS_AI_SUMMARIZER_ENABLED sem CONTEXT_BUDGET — summarizer inerte.'
  },
  {
    id: 'TOKEN_GOVERNANCE_ENFORCE_WITHOUT_BUDGET',
    severity: 'warn',
    when: () =>
      String(process.env.IMPETUS_AI_TOKEN_GOVERNANCE_ENFORCE || '').toLowerCase() === 'true' &&
      String(process.env.IMPETUS_AI_CONTEXT_BUDGET_ENABLED || '').toLowerCase() !== 'true',
    message: 'TOKEN_GOVERNANCE_ENFORCE sem CONTEXT_BUDGET.'
  },
  // WAVE 7 — governança industrial
  {
    id: 'ABAC_ENFORCE_WITHOUT_GOVERNANCE_V7',
    severity: 'warn',
    when: () =>
      String(process.env.IMPETUS_ABAC_ENFORCE || '').toLowerCase() === 'true' &&
      String(process.env.IMPETUS_GOVERNANCE_V7_ENABLED || '').toLowerCase() !== 'true',
    message: 'ABAC_ENFORCE=true sem GOVERNANCE_V7_ENABLED — políticas ABAC ineficazes.'
  },
  {
    id: 'WORKFLOW_PERMISSION_ENFORCE_WITHOUT_CAPABILITY_MATRIX',
    severity: 'warn',
    when: () =>
      String(process.env.IMPETUS_WORKFLOW_PERMISSION_ENFORCE || '').toLowerCase() === 'true' &&
      String(process.env.IMPETUS_WORKFLOW_CAPABILITY_MATRIX_ENABLED || '').toLowerCase() !== 'true',
    message: 'WORKFLOW_PERMISSION_ENFORCE=true sem CAPABILITY_MATRIX_ENABLED — permissões de workflow ineficazes.'
  },
  {
    id: 'AUDIT_HASH_CHAIN_WITHOUT_INDUSTRIAL_AUDIT',
    severity: 'warn',
    when: () =>
      String(process.env.IMPETUS_AUDIT_HASH_CHAIN_ENABLED || '').toLowerCase() === 'true' &&
      String(process.env.IMPETUS_INDUSTRIAL_AUDIT_ENABLED || '').toLowerCase() !== 'true',
    message: 'AUDIT_HASH_CHAIN_ENABLED=true sem INDUSTRIAL_AUDIT_ENABLED — hash chain sem eventos de auditoria a encadear.'
  },
  {
    id: 'QUALITY_UNIVERSAL_WITHOUT_INDUSTRIAL_EVENTS',
    severity: 'warn',
    when: () =>
      String(process.env.IMPETUS_QUALITY_UNIVERSAL_RUNTIME_ENABLED || '').toLowerCase() === 'true' &&
      String(process.env.IMPETUS_INDUSTRIAL_EVENTS_ENABLED || '').toLowerCase() !== 'true',
    message:
      'IMPETUS_QUALITY_UNIVERSAL_RUNTIME_ENABLED=true sem IMPETUS_INDUSTRIAL_EVENTS_ENABLED — módulo qualidade não publica no backbone.'
  },
  {
    id: 'QUALITY_OPERATIONAL_WITHOUT_INDUSTRIAL_EVENTS',
    severity: 'warn',
    when: () =>
      String(process.env.IMPETUS_QUALITY_OPERATIONAL_RUNTIME_ENABLED || '').toLowerCase() === 'true' &&
      String(process.env.IMPETUS_INDUSTRIAL_EVENTS_ENABLED || '').toLowerCase() !== 'true',
    message:
      'IMPETUS_QUALITY_OPERATIONAL_RUNTIME_ENABLED=true sem IMPETUS_INDUSTRIAL_EVENTS_ENABLED — colecta operacional não chega ao backbone.'
  },
  {
    id: 'QUALITY_GOVERNANCE_WITHOUT_INDUSTRIAL_EVENTS',
    severity: 'warn',
    when: () =>
      String(process.env.IMPETUS_QUALITY_GOVERNANCE_RUNTIME_ENABLED || '').toLowerCase() === 'true' &&
      String(process.env.IMPETUS_INDUSTRIAL_EVENTS_ENABLED || '').toLowerCase() !== 'true',
    message:
      'IMPETUS_QUALITY_GOVERNANCE_RUNTIME_ENABLED=true sem IMPETUS_INDUSTRIAL_EVENTS_ENABLED — governança qualidade não publica no backbone.'
  },
  {
    id: 'QUALITY_TELEMETRY_WITHOUT_W3_INGEST',
    severity: 'warn',
    when: () =>
      String(process.env.IMPETUS_QUALITY_TELEMETRY_RUNTIME_ENABLED || '').toLowerCase() === 'true' &&
      String(process.env.IMPETUS_TELEMETRY_ISOLATED_INGEST_ENABLED || '').toLowerCase() !== 'true',
    message:
      'IMPETUS_QUALITY_TELEMETRY_RUNTIME_ENABLED=true sem IMPETUS_TELEMETRY_ISOLATED_INGEST_ENABLED — ingest WAVE3 inerte (persistência indisponível).'
  },
  {
    id: 'QUALITY_TELEMETRY_BACKBONE_WITHOUT_EVENTS',
    severity: 'warn',
    when: () =>
      String(process.env.IMPETUS_QUALITY_TELEMETRY_BACKBONE_EVENTS_ENABLED || '').toLowerCase() === 'true' &&
      String(process.env.IMPETUS_INDUSTRIAL_EVENTS_ENABLED || '').toLowerCase() !== 'true',
    message:
      'IMPETUS_QUALITY_TELEMETRY_BACKBONE_EVENTS_ENABLED=true sem IMPETUS_INDUSTRIAL_EVENTS_ENABLED — marcadores de telemetria não chegam ao backbone.'
  },
  {
    id: 'QUALITY_TELEMETRY_WITHOUT_STORAGE_V3',
    severity: 'warn',
    when: () =>
      String(process.env.IMPETUS_QUALITY_TELEMETRY_RUNTIME_ENABLED || '').toLowerCase() === 'true' &&
      String(process.env.IMPETUS_STORAGE_V3_ENABLED || '').toLowerCase() !== 'true',
    message:
      'IMPETUS_QUALITY_TELEMETRY_RUNTIME_ENABLED=true sem IMPETUS_STORAGE_V3_ENABLED — storage temporal desligado.'
  },
  {
    id: 'QUALITY_COGNITIVE_PUBLISH_WITHOUT_INDUSTRIAL_EVENTS',
    severity: 'warn',
    when: () =>
      String(process.env.IMPETUS_QUALITY_COGNITIVE_PUBLISH_EVENTS_ENABLED || '').toLowerCase() === 'true' &&
      String(process.env.IMPETUS_INDUSTRIAL_EVENTS_ENABLED || '').toLowerCase() !== 'true',
    message:
      'IMPETUS_QUALITY_COGNITIVE_PUBLISH_EVENTS_ENABLED=true sem IMPETUS_INDUSTRIAL_EVENTS_ENABLED — sinais cognitivos não entram no backbone.'
  },
  {
    id: 'QUALITY_COGNITIVE_SUBFLAGS_WITHOUT_MASTER',
    severity: 'warn',
    when: () => {
      const master = String(process.env.IMPETUS_QUALITY_COGNITIVE_RUNTIME_ENABLED || '').toLowerCase() === 'true';
      if (master) return false;
      const subs = [
        'IMPETUS_QUALITY_DRIFT_PREDICTION_ENABLED',
        'IMPETUS_QUALITY_RECURRENCE_ANALYSIS_ENABLED',
        'IMPETUS_QUALITY_SUPPLIER_SCORING_ENABLED',
        'IMPETUS_QUALITY_ANOMALY_PREDICTION_ENABLED',
        'IMPETUS_QUALITY_PROCESS_DETERIORATION_ENABLED',
        'IMPETUS_QUALITY_CONTEXTUAL_RECOMMENDATIONS_ENABLED',
        'IMPETUS_QUALITY_EXECUTIVE_NARRATIVES_ENABLED',
        'IMPETUS_QUALITY_COGNITIVE_PUBLISH_EVENTS_ENABLED'
      ];
      return subs.some((k) => String(process.env[k] || '').toLowerCase() === 'true');
    },
    message:
      'Flag cognitiva de sub-motor activa sem IMPETUS_QUALITY_COGNITIVE_RUNTIME_ENABLED — motores ficam inacessíveis pela API.'
  },
  {
    id: 'QUALITY_ROLLOUT_PUBLISH_WITHOUT_INDUSTRIAL_EVENTS',
    severity: 'warn',
    when: () =>
      String(process.env.IMPETUS_QUALITY_ROLLOUT_PUBLISH_EVENTS_ENABLED || '').toLowerCase() === 'true' &&
      String(process.env.IMPETUS_INDUSTRIAL_EVENTS_ENABLED || '').toLowerCase() !== 'true',
    message:
      'IMPETUS_QUALITY_ROLLOUT_PUBLISH_EVENTS_ENABLED=true sem IMPETUS_INDUSTRIAL_EVENTS_ENABLED — eventos de rollout não entram no backbone.'
  },
  {
    id: 'QUALITY_ROLLOUT_SUBFLAGS_WITHOUT_MASTER',
    severity: 'warn',
    when: () => {
      const master = String(process.env.IMPETUS_QUALITY_ROLLOUT_RUNTIME_ENABLED || '').toLowerCase() === 'true';
      if (master) return false;
      const subs = [
        'IMPETUS_QUALITY_TENANT_ROLLOUT_ENABLED',
        'IMPETUS_QUALITY_PLANT_ROLLOUT_ENABLED',
        'IMPETUS_QUALITY_WORKFLOW_ROLLOUT_ENABLED',
        'IMPETUS_QUALITY_MATURITY_SCORING_ENABLED',
        'IMPETUS_QUALITY_ADOPTION_ANALYTICS_ENABLED',
        'IMPETUS_QUALITY_SATURATION_PROTECTION_ENABLED',
        'IMPETUS_QUALITY_READINESS_ENGINE_ENABLED',
        'IMPETUS_QUALITY_ROLLOUT_PUBLISH_EVENTS_ENABLED'
      ];
      return subs.some((k) => String(process.env[k] || '').toLowerCase() === 'true');
    },
    message:
      'Sub-flag de rollout activa sem IMPETUS_QUALITY_ROLLOUT_RUNTIME_ENABLED — API de rollout inacessível.'
  },
  {
    id: 'QUALITY_NAVIGATION_WITHOUT_OPERATIONAL',
    severity: 'warn',
    when: () =>
      String(process.env.IMPETUS_QUALITY_NAVIGATION_RUNTIME_ENABLED || '').toLowerCase() === 'true' &&
      String(process.env.IMPETUS_QUALITY_OPERATIONAL_RUNTIME_ENABLED || '').toLowerCase() !== 'true',
    message:
      'IMPETUS_QUALITY_NAVIGATION_RUNTIME_ENABLED sem operational — publicação de menu QUALITY inconsistente.'
  },
  {
    id: 'QUALITY_PUBLICATION_WITHOUT_NAVIGATION',
    severity: 'warn',
    when: () =>
      String(process.env.IMPETUS_QUALITY_PUBLICATION_RUNTIME_ENABLED || '').toLowerCase() === 'true' &&
      String(process.env.IMPETUS_QUALITY_NAVIGATION_RUNTIME_ENABLED || '').toLowerCase() !== 'true',
    message:
      'IMPETUS_QUALITY_PUBLICATION_RUNTIME_ENABLED sem NAVIGATION — cliente não activa publicação no menu.'
  }
];

let _snapshot = null;
let _validation = null;

function _maskValue(name, value) {
  if (value == null) return null;
  if (SENSITIVE_FLAGS.has(name)) {
    const s = String(value);
    if (!s) return '';
    return `[redacted:${s.length}chars]`;
  }
  return String(value);
}

function buildSnapshot() {
  const out = {};
  for (const f of KNOWN_FLAGS) {
    if (process.env[f] != null) out[f] = _maskValue(f, process.env[f]);
  }
  out.__captured_at = new Date().toISOString();
  return out;
}

function validate(snapshot) {
  const results = [];
  for (const r of RULES) {
    try {
      if (r.when()) {
        results.push({ id: r.id, severity: r.severity, message: r.message });
      }
    } catch (_e) {
      /* ignore */
    }
  }
  return { ok: results.every((r) => r.severity !== 'error'), findings: results };
}

/**
 * Captura o snapshot uma vez (idempotente em hot reload defensivo) e valida.
 * Devolve o relatório para o caller (server.js) decidir como apresentar.
 */
function bootstrap() {
  if (_snapshot && _validation) return { snapshot: _snapshot, validation: _validation };
  _snapshot = buildSnapshot();
  _validation = validate(_snapshot);
  try {
    console.info(
      '[FEATURE_GOVERNANCE_SNAPSHOT]',
      JSON.stringify({
        event: 'FEATURE_GOVERNANCE_SNAPSHOT',
        flags_set_count: Object.keys(_snapshot).length - 1,
        findings: _validation.findings
      })
    );
    for (const f of _validation.findings) {
      if (f.severity === 'error') {
        console.error('[FEATURE_GOVERNANCE_ERROR]', JSON.stringify(f));
      } else {
        console.warn('[FEATURE_GOVERNANCE_WARN]', JSON.stringify(f));
      }
    }
  } catch (_e) {
    /* ignore */
  }
  return { snapshot: _snapshot, validation: _validation };
}

/**
 * Leitura cacheada para hot path. Defaults preservados.
 */
function getFlag(name, fallback = undefined) {
  if (!_snapshot) bootstrap();
  if (Object.prototype.hasOwnProperty.call(_snapshot, name)) return _snapshot[name];
  if (process.env[name] != null) return process.env[name];
  return fallback;
}

function getValidation() {
  if (!_validation) bootstrap();
  return _validation;
}

function getSnapshot() {
  if (!_snapshot) bootstrap();
  return { ..._snapshot };
}

module.exports = {
  bootstrap,
  getFlag,
  getSnapshot,
  getValidation,
  KNOWN_FLAGS
};
