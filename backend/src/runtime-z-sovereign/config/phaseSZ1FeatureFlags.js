'use strict';

/**
 * SZ1 — Sovereignty Z Stage 1 (Enterprise Sovereignty Consolidation)
 *
 * Defaults SEGUROS: tudo arranca em shadow/off. Promoção é tenant-based,
 * shadow-first, rollback-safe. NUNCA full abrupto.
 *
 * Invariantes:
 *  - Motor A continua a ser bootstrap primário enquanto stage < Z_PRIMARY
 *  - Engine V2 mantém-se em retired_shadow_reference (C6) por defeito
 *  - Promoção automática DESLIGADA
 */

const STAGES = Object.freeze([
  'LEGACY_PRIMARY',
  'Z_SHADOW',
  'Z_ASSISTIVE',
  'Z_PRIMARY_WITH_A_FALLBACK',
  'Z_SOVEREIGN',
  'LEGACY_COMPATIBILITY_ONLY'
]);

function _flag(name, defaultVal = false) {
  const v = process.env[name];
  if (v == null || v === '') return defaultVal;
  return v === 'on' || v === 'true' || v === '1';
}

function _str(name, defaultVal = '') {
  const v = process.env[name];
  return v == null || v === '' ? defaultVal : String(v).toLowerCase();
}

function _stage(name, defaultVal = 'LEGACY_PRIMARY') {
  const v = String(process.env[name] || defaultVal).toUpperCase();
  return STAGES.includes(v) ? v : defaultVal;
}

module.exports = {
  STAGES,

  isSovereigntyEnabled: () => _flag('IMPETUS_SZ1_SOVEREIGNTY', true),
  isBootstrapRuntimeEnabled: () => _flag('IMPETUS_SZ1_BOOTSTRAP', true),
  isKpiRuntimeEnabled: () => _flag('IMPETUS_SZ1_KPI', true),
  isModuleRuntimeEnabled: () => _flag('IMPETUS_SZ1_MODULES', true),
  isSectionRuntimeEnabled: () => _flag('IMPETUS_SZ1_SECTIONS', true),
  isCompositionRuntimeEnabled: () => _flag('IMPETUS_SZ1_COMPOSITION', true),
  isContextRuntimeEnabled: () => _flag('IMPETUS_SZ1_CONTEXT', true),
  isIdentityRuntimeEnabled: () => _flag('IMPETUS_SZ1_IDENTITY', true),
  isHydrationRuntimeEnabled: () => _flag('IMPETUS_SZ1_HYDRATION', true),
  isFallbackRuntimeEnabled: () => _flag('IMPETUS_SZ1_FALLBACK', true),
  isResilienceRuntimeEnabled: () => _flag('IMPETUS_SZ1_RESILIENCE', true),
  isShadowDiffEnabled: () => _flag('IMPETUS_SZ1_SHADOW_DIFF', true),
  isPromotionEnabled: () => _flag('IMPETUS_SZ1_PROMOTION', true),
  isGovernanceEnabled: () => _flag('IMPETUS_SZ1_GOVERNANCE', true),
  isObservabilityEnabled: () => _flag('IMPETUS_SZ1_OBSERVABILITY', true),
  isApiEnabled: () => _flag('IMPETUS_SZ1_API', true),

  /**
   * Stage global por defeito (LEGACY_PRIMARY = Motor A continua a sustentar bootstrap).
   * O zPromotionRuntime pode resolver stage por tenant.
   */
  defaultStage: () => _stage('IMPETUS_SZ1_DEFAULT_STAGE', 'Z_SHADOW'),

  /**
   * Shadow sample rate (0..1) — fracção de requests onde Z corre em paralelo
   * para diff. Defaults a 1.0 quando shadow está activo.
   */
  shadowSampleRate: () => {
    const v = parseFloat(process.env.IMPETUS_SZ1_SHADOW_SAMPLE_RATE || '1');
    return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 1;
  },

  /**
   * Tenants explicitamente promovidos (CSV de company_id). Os restantes
   * usam defaultStage().
   */
  promotedTenants: () => {
    const raw = process.env.IMPETUS_SZ1_PROMOTED_TENANTS || '';
    return raw.split(',').map((s) => s.trim()).filter(Boolean);
  },

  promotedTenantStage: () => _stage('IMPETUS_SZ1_PROMOTED_TENANT_STAGE', 'Z_ASSISTIVE'),

  /**
   * Garantias invioláveis (nunca alteráveis por flag).
   */
  invariants: Object.freeze({
    motor_a_never_deleted: true,
    engine_v2_never_deleted: true,
    rollback_always_available: true,
    no_auto_promotion: true,
    additive_only: true,
    shadow_first: true,
    bounded_contexts_preserved: true,
    react_structurally_preserved: true,
    design_system_preserved: true,
    no_monolithization: true
  })
};
