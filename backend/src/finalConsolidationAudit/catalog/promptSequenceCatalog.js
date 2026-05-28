'use strict';

/**
 * Sequência oficial PROMPT 1–32 (SSOT para validação de produção).
 * production_acceptable: modos que contam como "ON" real (não shadow eterno).
 */

const PRODUCTION_MODES = Object.freeze(['on', 'enforce', 'true', '1', 'yes', 'active', 'enabled']);

const PROMPTS = Object.freeze([
  { id: 1, code: 'P01', title: 'Dashboard Visibility API', tier: 'T1', flags: [], doc: null, validate: 'visibility_route' },
  { id: 2, code: 'P02', title: 'Dashboard Payload Sections', tier: 'T1', flags: [], doc: null, validate: 'dashboard_sections' },
  { id: 3, code: 'P03', title: 'Universal Audit Middleware', tier: 'T1', flags: ['IMPETUS_AUDIT_MIDDLEWARE_UNIVERSAL'], doc: null, validate: 'audit_universal' },
  { id: 4, code: 'P04', title: 'Flag Reconciler Boot', tier: 'T1', flags: [], doc: null, validate: 'flag_reconciler' },
  { id: 5, code: 'P05', title: 'Cognitive Runtime Exec Split', tier: 'T1', flags: ['IMPETUS_COGNITIVE_RUNTIME_EXEC'], doc: null, validate: 'cognitive_exec' },
  { id: 6, code: 'P06', title: 'DSR / LGPD Workflow', tier: 'T1', flags: ['IMPETUS_DSR_ENABLED'], doc: null, validate: 'dsr_workflow' },
  { id: 7, code: 'P07', title: 'Retention Lifecycle', tier: 'T1', flags: ['IMPETUS_RETENTION_MODE'], doc: null, validate: 'retention' },
  { id: 8, code: 'P08', title: 'AI Anonymization Worker', tier: 'T1', flags: ['IMPETUS_AI_ANONYMIZATION_MODE'], doc: null, validate: 'ai_anon_worker' },
  { id: 9, code: 'P09', title: 'KMS Warm Startup', tier: 'T1', flags: ['IMPETUS_KMS_MODE'], doc: 'KMS_ENCRYPTION_ENTERPRISE_REPORT.md', validate: 'kms' },
  { id: 10, code: 'P10', title: 'SZ5 Cross-Thread Anonymization', tier: 'T1', flags: ['IMPETUS_SZ5_ANONYMIZATION_MODE'], doc: 'SZ5_ANONYMIZATION_ENTERPRISE_REPORT.md', validate: 'sz5_anon' },
  { id: 11, code: 'P11', title: 'KMS Governance Enterprise', tier: 'T1', flags: ['IMPETUS_KMS_MODE'], doc: 'KMS_ENCRYPTION_ENTERPRISE_REPORT.md', validate: 'kms' },
  { id: 12, code: 'P12', title: 'AI Model Registry + AI Cards', tier: 'T1', flags: ['IMPETUS_AI_MODEL_REGISTRY_MODE'], doc: 'AI_MODEL_REGISTRY_ENTERPRISE_REPORT.md', validate: 'ai_registry' },
  { id: 13, code: 'P13', title: 'Hallucination Detection V1', tier: 'T1', flags: ['IMPETUS_HALLUCINATION_DETECTION_MODE'], doc: 'HALLUCINATION_DETECTION_V1_REPORT.md', validate: 'hallucination' },
  { id: 14, code: 'P14', title: 'APM Enterprise (OTEL/Prometheus)', tier: 'T1', flags: ['IMPETUS_APM_ENTERPRISE_MODE'], enabled_flag: 'IMPETUS_APM_ENTERPRISE_ENABLED', doc: 'OPENTELEMETRY_GRAFANA_ENTERPRISE_REPORT.md', validate: 'apm' },
  { id: 15, code: 'P15', title: 'SZ4 Persistence', tier: 'T1', flags: ['IMPETUS_SZ4_PERSISTENCE'], doc: 'SZ4_PERSISTENCE_ENTERPRISE_REPORT.md', validate: 'sz4_persistence' },
  { id: 16, code: 'P16', title: 'Enterprise Federation', tier: 'T2', flags: ['IMPETUS_FEDERATION_MODE'], enabled_flag: 'IMPETUS_FEDERATION_ENABLED', doc: 'FEDERATION_ENTERPRISE_REPORT.md', validate: 'federation' },
  { id: 17, code: 'P17', title: 'MFA Universal', tier: 'T2', flags: ['IMPETUS_MFA_MODE'], enabled_flag: 'IMPETUS_MFA_ENABLED', doc: 'MFA_ENTERPRISE_REPORT.md', validate: 'mfa' },
  { id: 18, code: 'P18', title: 'RLS Multi-tenant', tier: 'T2', flags: ['IMPETUS_RLS_MODE'], enabled_flag: 'IMPETUS_RLS_ENABLED', doc: 'TENANT_RLS_HARDENING_REPORT.md', validate: 'rls' },
  { id: 19, code: 'P19', title: 'MQTT Real Runtime', tier: 'T2', flags: ['IMPETUS_MQTT_REAL_MODE'], doc: 'MQTT_REAL_ENTERPRISE_REPORT.md', validate: 'mqtt_real' },
  { id: 20, code: 'P20', title: 'OPC-UA Real Runtime', tier: 'T2', flags: ['IMPETUS_OPCUA_REAL_MODE'], doc: 'OPCUA_REAL_ENTERPRISE_REPORT.md', validate: 'opcua_real' },
  { id: 21, code: 'P21', title: 'Modbus Real Runtime', tier: 'T2', flags: ['IMPETUS_MODBUS_REAL_MODE'], doc: 'MODBUS_REAL_ENTERPRISE_REPORT.md', validate: 'modbus_real' },
  { id: 22, code: 'P22', title: 'Edge Runtime + Industrial Lab', tier: 'T2', flags: ['IMPETUS_EDGE_RUNTIME_MODE'], doc: 'EDGE_RUNTIME_INDUSTRIAL_LAB_REPORT.md', validate: 'edge_runtime' },
  { id: 23, code: 'P23', title: 'Industrial Event Backbone', tier: 'T3', flags: ['IMPETUS_INDUSTRIAL_BACKBONE_MODE'], doc: 'PROMPT_23_INDUSTRIAL_EVENT_BACKBONE_REPORT.md', validate: 'mode_flag' },
  { id: 24, code: 'P24', title: 'Action Runtime + HITL', tier: 'T3', flags: ['IMPETUS_ACTION_RUNTIME_MODE'], enabled_flag: 'IMPETUS_ACTION_RUNTIME_ENABLED', doc: 'PROMPT_24_ACTION_RUNTIME_HITL_REPORT.md', validate: 'mode_flag' },
  { id: 25, code: 'P25', title: 'Industrial Workflow Engine', tier: 'T3', flags: ['IMPETUS_WORKFLOW_ENGINE_MODE'], enabled_flag: 'IMPETUS_WORKFLOW_ENGINE_ENABLED', doc: 'PROMPT_25_INDUSTRIAL_WORKFLOW_ENGINE_REPORT.md', validate: 'mode_flag' },
  { id: 26, code: 'P26', title: 'Cognitive Registry SSOT', tier: 'T3', flags: ['IMPETUS_COGNITIVE_REGISTRY_CONSOLIDATION_MODE'], enabled_flag: 'IMPETUS_COGNITIVE_REGISTRY_SSOT_ENABLED', doc: 'PROMPT_26_COGNITIVE_REGISTRY_CONSOLIDATION_REPORT.md', validate: 'mode_flag' },
  { id: 27, code: 'P27', title: 'Legacy Deprecation Governance', tier: 'T3', flags: ['IMPETUS_LEGACY_DEPRECATION_MODE'], enabled_flag: 'IMPETUS_LEGACY_DEPRECATION_ENABLED', doc: 'PROMPT_27_LEGACY_DEPRECATION_REPORT.md', validate: 'mode_flag' },
  { id: 28, code: 'P28', title: 'Runtime Unification SZ5', tier: 'T3', flags: ['IMPETUS_RUNTIME_UNIFICATION_MODE'], enabled_flag: 'IMPETUS_RUNTIME_UNIFICATION_ENABLED', doc: 'PROMPT_28_RUNTIME_UNIFICATION_REPORT.md', validate: 'mode_flag' },
  { id: 29, code: 'P29', title: 'Rollout Center', tier: 'T3', flags: ['IMPETUS_ROLLOUT_CENTER_MODE'], enabled_flag: 'IMPETUS_ROLLOUT_CENTER_ENABLED', doc: 'PROMPT_29_ROLLOUT_CENTER_REPORT.md', validate: 'mode_flag' },
  { id: 30, code: 'P30', title: 'Enterprise Locale / i18n', tier: 'T3', flags: ['IMPETUS_ENTERPRISE_LOCALE_MODE'], enabled_flag: 'IMPETUS_ENTERPRISE_LOCALE_ENABLED', doc: 'PROMPT_30_ENTERPRISE_LOCALE_REPORT.md', validate: 'mode_flag' },
  { id: 31, code: 'P31', title: 'Certification Readiness', tier: 'T3', flags: ['IMPETUS_CERTIFICATION_READINESS_MODE'], enabled_flag: 'IMPETUS_CERTIFICATION_READINESS_ENABLED', doc: 'PROMPT_31_CERTIFICATION_READINESS_REPORT.md', validate: 'mode_flag' },
  { id: 32, code: 'P32', title: 'Final Consolidation Audit', tier: 'T3', flags: ['IMPETUS_FINAL_CONSOLIDATION_AUDIT_MODE'], enabled_flag: 'IMPETUS_FINAL_CONSOLIDATION_AUDIT_ENABLED', doc: 'PROMPT_32_FINAL_CONSOLIDATION_AUDIT_REPORT.md', validate: 'mode_flag' }
]);

const RUNTIME_ZONES = Object.freeze([
  { id: 'motor_a', label: 'Motor A (Dashboard Legado)', check: 'motor_a' },
  { id: 'engine_v2', label: 'Engine V2', check: 'engine_v2' },
  { id: 'runtime_z', label: 'Runtime Z', check: 'runtime_z' },
  { id: 'sz1', label: 'SZ1 Sovereignty', flags: ['IMPETUS_SZ1_SOVEREIGNTY'] },
  { id: 'sz2', label: 'SZ2 Cognitive OS', flags: ['IMPETUS_SZ2_ENABLED'] },
  { id: 'sz3', label: 'SZ3 Maturation', flags: ['IMPETUS_SZ3_ENABLED'] },
  { id: 'sz4', label: 'SZ4 Operational Nervous System', flags: ['IMPETUS_SZ4_ENABLED'] },
  { id: 'sz5', label: 'SZ5 Conversational Memory', flags: ['IMPETUS_SZ5_ENABLED'] },
  { id: 'edge_runtime', label: 'Edge Runtime', flags: ['IMPETUS_EDGE_RUNTIME_MODE'] },
  { id: 'action_runtime', label: 'Action Runtime + HITL', flags: ['IMPETUS_ACTION_RUNTIME_MODE'] },
  { id: 'ai_safety', label: 'AI Safety Stack', check: 'ai_safety' },
  { id: 'telemetry_real', label: 'Telemetria Real (MQTT/OPC/Modbus)', check: 'telemetry_real' },
  { id: 'rollout_governance', label: 'Rollout Governance', flags: ['IMPETUS_ROLLOUT_CENTER_MODE'] },
  { id: 'industrial_resilience', label: 'Industrial Resilience (Backbone)', flags: ['IMPETUS_INDUSTRIAL_BACKBONE_MODE'] }
]);

function listPrompts() {
  return PROMPTS.map((p) => ({ ...p, flags: [...(p.flags || [])] }));
}

function getPrompt(id) {
  return PROMPTS.find((p) => p.id === Number(id)) || null;
}

function isProductionMode(value) {
  const v = String(value || '').trim().toLowerCase();
  return PRODUCTION_MODES.includes(v);
}

module.exports = {
  PRODUCTION_MODES,
  PROMPTS,
  RUNTIME_ZONES,
  listPrompts,
  getPrompt,
  isProductionMode
};
