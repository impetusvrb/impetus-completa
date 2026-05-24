'use strict';

/**
 * SZ4 — Runtime Z Operational Nervous System
 * additive-only · shadow-first · HITL-first · rollback-safe
 */

const STAGES = Object.freeze([
  'SZ4_SHADOW',
  'SZ4_OBSERVATION',
  'SZ4_CONTINUITY_ACTIVE',
  'SZ4_TASK_RUNTIME_ACTIVE',
  'SZ4_REINTEGRATION_ACTIVE',
  'SZ4_OPERATIONAL_NERVOUS_SYSTEM'
]);

function _flag(name, defaultVal = false) {
  const v = process.env[name];
  if (v == null || v === '') return defaultVal;
  return v === 'on' || v === 'true' || v === '1';
}

function _stage(name, defaultVal = 'SZ4_SHADOW') {
  const v = String(process.env[name] || defaultVal).toUpperCase();
  return STAGES.includes(v) ? v : defaultVal;
}

function stageRank(stage) {
  const order = STAGES.indexOf(stage);
  return order >= 0 ? order : 0;
}

function isStageAtLeast(current, minimum) {
  return stageRank(current) >= stageRank(minimum);
}

module.exports = {
  STAGES,
  stageRank,
  isStageAtLeast,

  isEnabled: () => _flag('IMPETUS_SZ4_OPERATIONAL_NERVOUS_SYSTEM', true),
  isPipelineEnabled: () => _flag('IMPETUS_SZ4_PIPELINE', true),
  isInternalChatEnabled: () => _flag('IMPETUS_SZ4_INTERNAL_CHAT', true),
  isTaskRuntimeEnabled: () => _flag('IMPETUS_SZ4_TASK_RUNTIME', true),
  isWorkflowEnabled: () => _flag('IMPETUS_SZ4_WORKFLOW', true),
  isReminderEnabled: () => _flag('IMPETUS_SZ4_REMINDER', true),
  isReintegrationEnabled: () => _flag('IMPETUS_SZ4_REINTEGRATION', true),
  isAwarenessEnabled: () => _flag('IMPETUS_SZ4_AWARENESS', true),
  isObservationEnabled: () => _flag('IMPETUS_SZ4_OBSERVATION', true),
  isExecutionEnabled: () => _flag('IMPETUS_SZ4_EXECUTION', true),
  isCommunicationEnabled: () => _flag('IMPETUS_SZ4_COMMUNICATION', true),
  isIntelligenceEnabled: () => _flag('IMPETUS_SZ4_INTELLIGENCE', true),
  isObservabilityEnabled: () => _flag('IMPETUS_SZ4_OBSERVABILITY', true),
  isGovernanceEnabled: () => _flag('IMPETUS_SZ4_GOVERNANCE', true),
  isShadowEnabled: () => _flag('IMPETUS_SZ4_SHADOW', true),
  isResilienceEnabled: () => _flag('IMPETUS_SZ4_RESILIENCE', true),
  isApiEnabled: () => _flag('IMPETUS_SZ4_API', true),
  isPersistenceEnabled: () => _flag('IMPETUS_SZ4_PERSISTENCE', false),
  isVoiceIdentityPrepEnabled: () => _flag('IMPETUS_SZ4_VOICE_IDENTITY_PREP', true),

  defaultStage: () => _stage('IMPETUS_SZ4_DEFAULT_STAGE', 'SZ4_SHADOW'),
  promotedTenants: () => {
    const raw = process.env.IMPETUS_SZ4_PROMOTED_TENANTS || '';
    return raw.split(',').map((s) => s.trim()).filter(Boolean);
  },
  promotedTenantStage: () => _stage('IMPETUS_SZ4_PROMOTED_TENANT_STAGE', 'SZ4_OBSERVATION'),

  observationBudgetPerHour: () => {
    const v = parseInt(process.env.IMPETUS_SZ4_OBSERVATION_BUDGET_HOUR || '120', 10);
    return Number.isFinite(v) && v > 0 ? v : 120;
  },
  cognitiveThrottleMs: () => {
    const v = parseInt(process.env.IMPETUS_SZ4_COGNITIVE_THROTTLE_MS || '800', 10);
    return Number.isFinite(v) && v >= 0 ? v : 800;
  },

  invariants: Object.freeze({
    assistive_only: true,
    human_authority_preserved: true,
    auto_execution: false,
    auto_escalation: false,
    approval_required: true,
    tenant_safe: true,
    hierarchy_safe: true,
    rollback_safe: true,
    shadow_first: true,
    bounded_contexts_preserved: true,
    motor_a_never_deleted: true,
    engine_v2_never_deleted: true,
    sz1_sz2_sz3_preserved: true,
    no_autonomous_plc: true,
    no_biometric_enforcement: true
  })
};
