'use strict';

/**
 * Catálogo SSOT de capacidades com rollout governado (waves PROMPT 23–28 + enterprise).
 */

const MODE_LADDER = Object.freeze(['off', 'shadow', 'audit', 'on']);

const CAPABILITIES = Object.freeze([
  {
    id: 'industrial_event_backbone',
    label: 'Industrial Event Backbone',
    prompt: 'P23',
    mode_flag: 'IMPETUS_INDUSTRIAL_BACKBONE_MODE',
    pilot_env: 'IMPETUS_INDUSTRIAL_BACKBONE_PILOT_TENANTS',
    allowed_modes: MODE_LADDER,
    runtime_stage: 'execution',
    health_route: '/api/internal/industrial-event-backbone/health'
  },
  {
    id: 'action_runtime_hitl',
    label: 'Action Runtime + HITL',
    prompt: 'P24',
    mode_flag: 'IMPETUS_ACTION_RUNTIME_MODE',
    enabled_flag: 'IMPETUS_ACTION_RUNTIME_ENABLED',
    pilot_env: 'IMPETUS_ACTION_RUNTIME_PILOT_TENANTS',
    allowed_modes: MODE_LADDER,
    runtime_stage: 'execution',
    health_route: '/api/action-runtime/health'
  },
  {
    id: 'workflow_engine',
    label: 'Industrial Workflow Engine',
    prompt: 'P25',
    mode_flag: 'IMPETUS_WORKFLOW_ENGINE_MODE',
    enabled_flag: 'IMPETUS_WORKFLOW_ENGINE_ENABLED',
    pilot_env: 'IMPETUS_WORKFLOW_ENGINE_PILOT_TENANTS',
    allowed_modes: MODE_LADDER,
    runtime_stage: 'execution',
    health_route: '/api/workflow-engine/health'
  },
  {
    id: 'cognitive_registry_ssot',
    label: 'Cognitive Registry SSOT',
    prompt: 'P26',
    mode_flag: 'IMPETUS_COGNITIVE_REGISTRY_CONSOLIDATION_MODE',
    enabled_flag: 'IMPETUS_COGNITIVE_REGISTRY_SSOT_ENABLED',
    pilot_env: 'IMPETUS_COGNITIVE_REGISTRY_PILOT_TENANTS',
    allowed_modes: MODE_LADDER,
    runtime_stage: 'authoritative',
    health_route: '/api/cognitive-registry/health'
  },
  {
    id: 'legacy_deprecation',
    label: 'Legacy Deprecation Governance',
    prompt: 'P27',
    mode_flag: 'IMPETUS_LEGACY_DEPRECATION_MODE',
    enabled_flag: 'IMPETUS_LEGACY_DEPRECATION_ENABLED',
    pilot_env: 'IMPETUS_LEGACY_DEPRECATION_PILOT_TENANTS',
    allowed_modes: MODE_LADDER,
    runtime_stage: 'observability',
    health_route: '/api/deprecation-governance/health'
  },
  {
    id: 'runtime_unification_sz5',
    label: 'Runtime Unification (SZ5)',
    prompt: 'P28',
    mode_flag: 'IMPETUS_RUNTIME_UNIFICATION_MODE',
    enabled_flag: 'IMPETUS_RUNTIME_UNIFICATION_ENABLED',
    pilot_env: 'IMPETUS_RUNTIME_UNIFICATION_PILOT_TENANTS',
    allowed_modes: MODE_LADDER,
    runtime_stage: 'enrich',
    health_route: '/api/runtime-unification/health'
  },
  {
    id: 'sz5_anonymization',
    label: 'SZ5 Anonymization',
    prompt: 'T1',
    mode_flag: 'IMPETUS_SZ5_ANONYMIZATION_MODE',
    allowed_modes: ['off', 'audit', 'on'],
    runtime_stage: 'execution',
    health_route: '/api/runtime-z-sovereign/sz5/health'
  },
  {
    id: 'apm_enterprise',
    label: 'APM Enterprise',
    prompt: 'T1',
    mode_flag: 'IMPETUS_APM_ENTERPRISE_MODE',
    enabled_flag: 'IMPETUS_APM_ENTERPRISE_ENABLED',
    allowed_modes: ['off', 'shadow', 'on'],
    runtime_stage: 'observability',
    health_route: null
  },
  {
    id: 'rls_tenant',
    label: 'Row-Level Security',
    prompt: 'T1',
    mode_flag: 'IMPETUS_RLS_MODE',
    enabled_flag: 'IMPETUS_RLS_ENABLED',
    allowed_modes: ['off', 'audit', 'on'],
    runtime_stage: 'authoritative',
    health_route: null
  },
  {
    id: 'mfa_enterprise',
    label: 'MFA Enterprise',
    prompt: 'T1',
    mode_flag: 'IMPETUS_MFA_MODE',
    enabled_flag: 'IMPETUS_MFA_ENABLED',
    allowed_modes: ['off', 'audit', 'on'],
    runtime_stage: 'execution',
    health_route: null
  },
  {
    id: 'enterprise_locale_engine',
    label: 'Enterprise Locale / i18n',
    prompt: 'P30',
    mode_flag: 'IMPETUS_ENTERPRISE_LOCALE_MODE',
    enabled_flag: 'IMPETUS_ENTERPRISE_LOCALE_ENABLED',
    allowed_modes: MODE_LADDER,
    runtime_stage: 'enrich',
    health_route: '/api/enterprise-locale/health'
  },
  {
    id: 'certification_readiness',
    label: 'Certification Readiness',
    prompt: 'P31',
    mode_flag: 'IMPETUS_CERTIFICATION_READINESS_MODE',
    enabled_flag: 'IMPETUS_CERTIFICATION_READINESS_ENABLED',
    allowed_modes: MODE_LADDER,
    runtime_stage: 'observability',
    health_route: '/api/certification-readiness/health'
  },
  {
    id: 'final_consolidation_audit',
    label: 'Final Consolidation Audit',
    prompt: 'P32',
    mode_flag: 'IMPETUS_FINAL_CONSOLIDATION_AUDIT_MODE',
    enabled_flag: 'IMPETUS_FINAL_CONSOLIDATION_AUDIT_ENABLED',
    allowed_modes: MODE_LADDER,
    runtime_stage: 'observability',
    health_route: '/api/final-consolidation-audit/health'
  }
]);

const _byId = new Map(CAPABILITIES.map((c) => [c.id, c]));

function listCapabilities() {
  return CAPABILITIES.map((c) => ({ ...c, allowed_modes: [...c.allowed_modes] }));
}

function getCapability(id) {
  return _byId.get(String(id || '').trim()) || null;
}

function nextModeInLadder(current, allowedModes) {
  const ladder = allowedModes || MODE_LADDER;
  const idx = ladder.indexOf(String(current || 'off').toLowerCase());
  if (idx < 0 || idx >= ladder.length - 1) return null;
  return ladder[idx + 1];
}

module.exports = {
  MODE_LADDER,
  CAPABILITIES,
  listCapabilities,
  getCapability,
  nextModeInLadder
};
