'use strict';

/**
 * SZ3 — Runtime Z Cognitive Maturation Layer
 *
 * Aprende padrões, calibra inferências, reduz ruído, amadurece linguagem
 * operacional e ergonomia cognitiva industrial.
 *
 * Tipo: additive-only · shadow-first · assistive-only · rollback-safe
 *
 * STAGES:
 *  OBSERVATION_ONLY     — observa, acumula padrões, não enriquece respostas
 *  LANGUAGE_MATURE      — enriquece narrativa com linguagem operacional madura
 *  CALIBRATION_ACTIVE   — aplica calibração de inferências (ruído reduzido)
 *  ERGONOMICS_ACTIVE    — molda resposta com ergonomia industrial
 *  MATURATION_SOVEREIGN — Z fala com linguagem industrial nativa completa
 */

const STAGES = Object.freeze([
  'OBSERVATION_ONLY',
  'LANGUAGE_MATURE',
  'CALIBRATION_ACTIVE',
  'ERGONOMICS_ACTIVE',
  'MATURATION_SOVEREIGN'
]);

function _flag(name, def = false) {
  const v = process.env[name];
  if (v == null || v === '') return def;
  return v === 'on' || v === 'true' || v === '1';
}

function _stage(name, def = 'OBSERVATION_ONLY') {
  const v = String(process.env[name] || def).toUpperCase();
  return STAGES.includes(v) ? v : def;
}

module.exports = {
  STAGES,
  isEnabled: () => _flag('IMPETUS_SZ3_MATURATION', true),
  isPatternsEnabled: () => _flag('IMPETUS_SZ3_PATTERNS', true),
  isCalibrationEnabled: () => _flag('IMPETUS_SZ3_CALIBRATION', true),
  isLanguageEnabled: () => _flag('IMPETUS_SZ3_LANGUAGE', true),
  isErgonomicsEnabled: () => _flag('IMPETUS_SZ3_ERGONOMICS', true),
  isIndustrialEnabled: () => _flag('IMPETUS_SZ3_INDUSTRIAL', true),
  isPrioritizationEnabled: () => _flag('IMPETUS_SZ3_PRIORITIZATION', true),
  isObservabilityEnabled: () => _flag('IMPETUS_SZ3_OBSERVABILITY', true),
  isApiEnabled: () => _flag('IMPETUS_SZ3_API', true),

  defaultStage: () => _stage('IMPETUS_SZ3_DEFAULT_STAGE', 'OBSERVATION_ONLY'),
  promotedTenants: () =>
    (process.env.IMPETUS_SZ3_PROMOTED_TENANTS || '').split(',').map((s) => s.trim()).filter(Boolean),
  promotedStage: () => _stage('IMPETUS_SZ3_PROMOTED_STAGE', 'LANGUAGE_MATURE'),

  noiseThreshold: () => {
    const v = parseFloat(process.env.IMPETUS_SZ3_NOISE_THRESHOLD || '0.35');
    return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0.35;
  },
  patternMinFrequency: () => {
    const v = parseInt(process.env.IMPETUS_SZ3_PATTERN_MIN_FREQ || '2', 10);
    return Number.isFinite(v) && v > 0 ? v : 2;
  },
  patternMaxPerTenant: () => {
    const v = parseInt(process.env.IMPETUS_SZ3_PATTERN_MAX || '200', 10);
    return Number.isFinite(v) && v > 0 ? v : 200;
  },

  invariants: Object.freeze({
    assistive_only: true,
    auto_execution: false,
    auto_enforcement: false,
    auto_promotion: false,
    no_ml_training: true,
    no_external_model_calls: true,
    rollback_safe: true,
    shadow_first: true,
    tenant_isolation_required: true,
    human_authority_preserved: true
  })
};
