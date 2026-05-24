'use strict';

/**
 * SZ2 — Runtime Z Cognitive Operating System
 *
 * Activação granular shadow-first, assistive-only, sem auto-execução.
 *
 * STAGES (promoção SEMPRE manual / tenant-based):
 *  - LEGACY_COGNITIVE          : chat actual, SZ2 não corre
 *  - Z_COGNITIVE_SHADOW (def)  : SZ2 corre paralelo, observa, não influencia
 *  - Z_CONTEXT_ASSISTIVE       : injecta contexto na resposta da IA
 *  - Z_OPERATIONAL_ASSISTIVE   : sugere acções preparadas (nunca executa)
 *  - Z_STATEFUL_REASONING      : raciocínio multi-passo persistente
 *  - Z_COGNITIVE_SOVEREIGN     : Z é fonte primária do contexto cognitivo
 */

const STAGES = Object.freeze([
  'LEGACY_COGNITIVE',
  'Z_COGNITIVE_SHADOW',
  'Z_CONTEXT_ASSISTIVE',
  'Z_OPERATIONAL_ASSISTIVE',
  'Z_STATEFUL_REASONING',
  'Z_COGNITIVE_SOVEREIGN'
]);

function _flag(name, defaultVal = false) {
  const v = process.env[name];
  if (v == null || v === '') return defaultVal;
  return v === 'on' || v === 'true' || v === '1';
}

function _stage(name, defaultVal = 'Z_COGNITIVE_SHADOW') {
  const v = String(process.env[name] || defaultVal).toUpperCase();
  return STAGES.includes(v) ? v : defaultVal;
}

module.exports = {
  STAGES,
  isEnabled: () => _flag('IMPETUS_SZ2_COGNITIVE_OS', true),
  isMemoryEnabled: () => _flag('IMPETUS_SZ2_MEMORY', true),
  isContinuityEnabled: () => _flag('IMPETUS_SZ2_CONTINUITY', true),
  isReasoningEnabled: () => _flag('IMPETUS_SZ2_REASONING', true),
  isContextInferenceEnabled: () => _flag('IMPETUS_SZ2_CONTEXT', true),
  isActionsEnabled: () => _flag('IMPETUS_SZ2_ACTIONS', true),
  isCognitionEnabled: () => _flag('IMPETUS_SZ2_COGNITION', true),
  isOrchestrationEnabled: () => _flag('IMPETUS_SZ2_ORCHESTRATION', true),
  isObservabilityEnabled: () => _flag('IMPETUS_SZ2_OBSERVABILITY', true),
  isGovernanceEnabled: () => _flag('IMPETUS_SZ2_GOVERNANCE', true),
  isShadowDiffEnabled: () => _flag('IMPETUS_SZ2_SHADOW_DIFF', true),
  isResilienceEnabled: () => _flag('IMPETUS_SZ2_RESILIENCE', true),
  isApiEnabled: () => _flag('IMPETUS_SZ2_API', true),
  isPersistenceEnabled: () => _flag('IMPETUS_SZ2_PERSISTENCE', false),

  defaultStage: () => _stage('IMPETUS_SZ2_DEFAULT_STAGE', 'Z_COGNITIVE_SHADOW'),
  promotedTenants: () => {
    const raw = process.env.IMPETUS_SZ2_PROMOTED_TENANTS || '';
    return raw.split(',').map((s) => s.trim()).filter(Boolean);
  },
  promotedTenantStage: () => _stage('IMPETUS_SZ2_PROMOTED_TENANT_STAGE', 'Z_CONTEXT_ASSISTIVE'),

  memoryRetentionMinutes: () => {
    const v = parseInt(process.env.IMPETUS_SZ2_MEMORY_RETENTION_MIN, 10);
    return Number.isFinite(v) && v > 0 ? v : 60 * 24;
  },
  memoryMaxEntriesPerTenant: () => {
    const v = parseInt(process.env.IMPETUS_SZ2_MEMORY_MAX_ENTRIES, 10);
    return Number.isFinite(v) && v > 0 ? v : 500;
  },

  invariants: Object.freeze({
    assistive_only: true,
    auto_execution: false,
    auto_enforcement: false,
    auto_promotion: false,
    plc_control: false,
    human_authority_preserved: true,
    rollback_safe: true,
    shadow_first: true,
    bounded_contexts_preserved: true,
    motor_a_never_deleted: true,
    engine_v2_never_deleted: true,
    no_monolithization: true,
    tenant_isolation_required: true
  })
};
