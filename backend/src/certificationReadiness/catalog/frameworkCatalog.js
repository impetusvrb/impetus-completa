'use strict';

/**
 * Control catalog — ISO 27001, ISO 42001, SOC 2, IEC 62443 (subset operacional IMPETUS).
 */

const FRAMEWORKS = Object.freeze({
  ISO_27001: 'ISO_27001',
  ISO_42001: 'ISO_42001',
  SOC2: 'SOC2',
  IEC_62443: 'IEC_62443'
});

/** evidence_key → avaliado em evidenceInventoryCollector */
const CONTROLS = Object.freeze([
  // ISO 27001
  { id: 'ISO27001-A.8.15', framework: 'ISO_27001', family: 'Logging', title: 'Logging & audit trails', weight: 2, evidence: ['universal_audit', 'audit_logs_table'] },
  { id: 'ISO27001-A.8.24', framework: 'ISO_27001', family: 'Crypto', title: 'Cryptography / KMS', weight: 2, evidence: ['kms_governance', 'encryption_at_rest'] },
  { id: 'ISO27001-A.5.15', framework: 'ISO_27001', family: 'Access', title: 'Access control / RBAC', weight: 2, evidence: ['rbac_middleware', 'mfa_enabled'] },
  { id: 'ISO27001-A.8.10', framework: 'ISO_27001', family: 'Data', title: 'Information deletion (DSR)', weight: 2, evidence: ['dsr_export', 'dsr_erase'] },
  { id: 'ISO27001-A.5.34', framework: 'ISO_27001', family: 'Privacy', title: 'Privacy & LGPD retention', weight: 1, evidence: ['retention_policy', 'rls_enabled'] },
  // ISO 42001
  { id: 'ISO42001-AI-1', framework: 'ISO_42001', family: 'AI-Governance', title: 'AI system inventory', weight: 2, evidence: ['ai_model_registry'] },
  { id: 'ISO42001-AI-2', framework: 'ISO_42001', family: 'AI-Governance', title: 'Human oversight (HITL)', weight: 2, evidence: ['action_runtime_hitl', 'ai_traces_governance'] },
  { id: 'ISO42001-AI-3', framework: 'ISO_42001', family: 'AI-Governance', title: 'Explainability & lineage', weight: 2, evidence: ['prompt_lineage', 'hallucination_detection'] },
  { id: 'ISO42001-AI-4', framework: 'ISO_42001', family: 'AI-Governance', title: 'AI risk monitoring', weight: 1, evidence: ['ai_incidents', 'apm_enterprise'] },
  // SOC 2
  { id: 'SOC2-CC6.1', framework: 'SOC2', family: 'Security', title: 'Logical access controls', weight: 2, evidence: ['rbac_middleware', 'federation_sso'] },
  { id: 'SOC2-CC7.2', framework: 'SOC2', family: 'Security', title: 'System monitoring', weight: 2, evidence: ['apm_enterprise', 'observability_v2'] },
  { id: 'SOC2-CC8.1', framework: 'SOC2', family: 'Change', title: 'Change management / rollout', weight: 1, evidence: ['rollout_center', 'flag_reconciler'] },
  { id: 'SOC2-CC9.1', framework: 'SOC2', family: 'Risk', title: 'Risk mitigation (failsafe)', weight: 2, evidence: ['failsafe_governance', 'governance_shadow_off'] },
  { id: 'SOC2-A1.2', framework: 'SOC2', family: 'Availability', title: 'Recovery / DR evidence', weight: 1, evidence: ['pm2_runtime', 'industrial_backbone'] },
  // IEC 62443
  { id: 'IEC62443-SL-T2', framework: 'IEC_62443', family: 'Industrial', title: 'Industrial event backbone', weight: 2, evidence: ['industrial_backbone', 'event_audit'] },
  { id: 'IEC62443-SL-T3', framework: 'IEC_62443', family: 'Industrial', title: 'OT connectors (MQTT/OPC)', weight: 2, evidence: ['mqtt_real', 'opcua_real', 'modbus_real'] },
  { id: 'IEC62443-SL-T4', framework: 'IEC_62443', family: 'Industrial', title: 'Edge runtime governance', weight: 1, evidence: ['edge_runtime', 'industrial_lab'] },
  { id: 'IEC62443-ZCR', framework: 'IEC_62443', family: 'Industrial', title: 'Zone segmentation / tenant', weight: 2, evidence: ['tenant_isolation', 'rls_enabled'] }
]);

function listFrameworks() {
  return [
    { id: FRAMEWORKS.ISO_27001, label: 'ISO/IEC 27001', scope: 'Information Security Management' },
    { id: FRAMEWORKS.ISO_42001, label: 'ISO/IEC 42001', scope: 'AI Management System' },
    { id: FRAMEWORKS.SOC2, label: 'SOC 2 Type II', scope: 'Trust Services Criteria' },
    { id: FRAMEWORKS.IEC_62443, label: 'IEC 62443', scope: 'Industrial Cybersecurity' }
  ];
}

function listControls(frameworkFilter = null) {
  let items = CONTROLS.map((c) => ({ ...c }));
  if (frameworkFilter) {
    items = items.filter((c) => c.framework === frameworkFilter);
  }
  return items;
}

module.exports = { FRAMEWORKS, CONTROLS, listFrameworks, listControls };
