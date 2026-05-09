'use strict';

/**
 * Ajuste controlado de parâmetros (confiança, thresholds) — sem alterar decisões do motor/pipeline.
 * Limites rígidos; desligar com IMPETUS_ADAPTIVE_TUNING_ENABLED=false.
 * Ajustes por aprendizagem supervisionada (Fase 7): só com aprovação admin;
 * desligar aplicação com IMPETUS_SUPERVISED_LEARNING_APPLY=false.
 * Fase 8 — ajustes estratégicos aprovados: IMPETUS_STRATEGIC_LEARNING_APPLY;
 * rollout gradual: IMPETUS_STRATEGIC_ROLLOUT_ENABLED + IMPETUS_STRATEGIC_ROLLOUT_PCT (0–1).
 */

/** @type {{ confidenceFactor?: number, strategy?: string }} */
let approvedAdjustments = {};

function isSupervisedLearningApplyEnabled() {
  const v = String(process.env.IMPETUS_SUPERVISED_LEARNING_APPLY ?? 'true')
    .trim()
    .toLowerCase();
  return v !== 'false' && v !== '0' && v !== 'no';
}

function isStrategicLearningApplyEnabled() {
  const v = String(process.env.IMPETUS_STRATEGIC_LEARNING_APPLY ?? 'true')
    .trim()
    .toLowerCase();
  return v !== 'false' && v !== '0' && v !== 'no';
}

function isStrategicRolloutEnabled() {
  const v = String(process.env.IMPETUS_STRATEGIC_ROLLOUT_ENABLED ?? 'true')
    .trim()
    .toLowerCase();
  return v !== 'false' && v !== '0' && v !== 'no';
}

function getStrategicRolloutProbability() {
  const raw = Number(process.env.IMPETUS_STRATEGIC_ROLLOUT_PCT ?? '0.2');
  return Number.isFinite(raw) ? Math.max(0, Math.min(1, raw)) : 0.2;
}

/**
 * Rollout probabilístico por invocação (texto vs confiança podem divergir — subset independente).
 * @returns {boolean}
 */
function shouldApplyStrategicAdjustment() {
  if (!isStrategicRolloutEnabled()) return false;
  return Math.random() < getStrategicRolloutProbability();
}

function isAdaptiveTuningEnabled() {
  const v = String(process.env.IMPETUS_ADAPTIVE_TUNING_ENABLED ?? 'true')
    .trim()
    .toLowerCase();
  return v !== 'false' && v !== '0' && v !== 'no';
}

/**
 * Multiplicador sobre score interno 0–100 (após regras base, antes do clamp).
 * @param {number} score
 * @returns {number}
 */
function applyApprovedAdjustments(score) {
  if (!isSupervisedLearningApplyEnabled()) return score;
  const f = approvedAdjustments.confidenceFactor;
  if (f == null || !Number.isFinite(Number(f))) return score;
  return score * Number(f);
}

/**
 * Mescla ajustes aprovados (limitado: factor ∈ [0.5, 1] — só redução controlada).
 * @param {{ confidenceFactor?: number, strategy?: string }} patch
 */
function mergeApprovedAdjustments(patch) {
  if (!patch || typeof patch !== 'object') return;

  if (patch.confidenceFactor != null) {
    if (!isSupervisedLearningApplyEnabled()) {
      try {
        console.log('[LEARNING_APPLIED]', {
          skipped: true,
          reason: 'IMPETUS_SUPERVISED_LEARNING_APPLY disabled (confidenceFactor)'
        });
      } catch (_e) {}
    } else {
      const n = Number(patch.confidenceFactor);
      if (Number.isFinite(n)) {
        approvedAdjustments.confidenceFactor = Math.max(0.5, Math.min(1, n));
      }
    }
  }

  if (patch.strategy != null) {
    if (!isStrategicLearningApplyEnabled()) {
      try {
        console.log('[LEARNING_APPLIED]', {
          skipped: true,
          reason: 'IMPETUS_STRATEGIC_LEARNING_APPLY disabled (strategy)'
        });
      } catch (_e) {}
    } else {
      const s = String(patch.strategy);
      if (s === 'increase_no_data_guidance' || s === 'reduce_assertiveness') {
        approvedAdjustments.strategy = s;
      }
    }
  }

  try {
    console.log('[LEARNING_APPLIED]', { ...approvedAdjustments });
  } catch (_e) {}
}

function resolveContextDataState(context) {
  if (!context || typeof context !== 'object') return undefined;
  if (context.metrics && context.metrics.data_state != null) {
    return String(context.metrics.data_state);
  }
  const pack = context.contextual_pack;
  if (pack && typeof pack === 'object' && pack.metrics && pack.metrics.data_state != null) {
    return String(pack.metrics.data_state);
  }
  return undefined;
}

/**
 * Narrativa segmentada (só contextos sem produção activa) — requer aprovação + rollout.
 * @param {{ text?: string, context?: object }} params
 * @returns {string}
 */
function applyStrategicAdjustments({ text, context }) {
  const t = text != null ? String(text) : '';
  if (!isStrategicLearningApplyEnabled()) return t;
  if (!approvedAdjustments.strategy) return t;
  if (!shouldApplyStrategicAdjustment()) return t;

  if (approvedAdjustments.strategy === 'increase_no_data_guidance') {
    const ds = resolveContextDataState(context);
    if (ds !== 'production_active') {
      const out = `${t}\n\nSugestão: configure fontes de dados para melhorar a análise.`;
      try {
        console.log('[STRATEGIC_APPLIED]', { adjustment: 'increase_no_data_guidance', kind: 'text_tail' });
      } catch (_e) {}
      return out;
    }
  }

  return t;
}

function clearApprovedLearningAdjustments() {
  approvedAdjustments = {};
  try {
    console.log('[LEARNING_APPLIED]', { ...approvedAdjustments });
  } catch (_e) {}
}

/**
 * Fase 9 — patch só com IMPETUS_AUTONOMOUS_OPTIMIZATION_ENABLED=true (independente do flag de aprendizagem supervisionada).
 * `factor` já deve vir limitado pelo chamador (passo e piso globais).
 * @param {{ confidenceFactor: number }} patch
 * @returns {boolean}
 */
function mergeAutonomousOptimizationPatch(patch) {
  if (process.env.IMPETUS_AUTONOMOUS_OPTIMIZATION_ENABLED !== 'true') {
    try {
      console.log('[AUTONOMOUS_SKIPPED]', { reason: 'IMPETUS_AUTONOMOUS_OPTIMIZATION_ENABLED', patch });
    } catch (_e) {}
    return false;
  }
  if (!patch || patch.confidenceFactor == null) return false;
  const n = Number(patch.confidenceFactor);
  if (!Number.isFinite(n)) return false;
  approvedAdjustments.confidenceFactor = Math.max(0.5, Math.min(1, n));
  try {
    console.log('[LEARNING_APPLIED]', { ...approvedAdjustments, source: 'autonomous_optimization' });
  } catch (_e) {}
  return true;
}

/** Reversão de segurança — repõe factor 1 (Fase 9). */
function rollbackAutonomousOptimizationConfidence() {
  approvedAdjustments.confidenceFactor = 1;
  try {
    console.log('[LEARNING_APPLIED]', { ...approvedAdjustments, source: 'autonomous_rollback' });
  } catch (_e) {}
}

function getApprovedLearningAdjustments() {
  return { ...approvedAdjustments };
}

/**
 * @param {number} baseScore — escala 0–1 (ex. decision_score) ou 0–100
 * @param {string|undefined|null} data_state
 * @param {number|undefined|null} completeness — típico 0–1
 * @returns {number} mesma escala que a entrada (0–1 ou 0–100)
 */
function adjustConfidence({ baseScore, data_state, completeness }) {
  let raw = Number(baseScore);
  if (!Number.isFinite(raw)) return baseScore;

  const unitScale = raw >= 0 && raw <= 1;
  let score = unitScale ? raw * 100 : raw;

  if (data_state !== 'production_active') {
    score *= 0.6;
  }

  if (typeof completeness === 'number' && Number.isFinite(completeness)) {
    score *= Math.max(0.4, completeness);
  }

  score = applyApprovedAdjustments(score);

  if (
    isStrategicLearningApplyEnabled() &&
    approvedAdjustments.strategy === 'reduce_assertiveness' &&
    shouldApplyStrategicAdjustment()
  ) {
    try {
      console.log('[STRATEGIC_APPLIED]', { adjustment: 'reduce_assertiveness', kind: 'confidence_tempering' });
    } catch (_e) {}
    score *= 0.94;
  }

  const clamped = Math.max(0, Math.min(100, score));
  const rounded = Math.round(clamped);
  return unitScale ? rounded / 100 : rounded;
}

/**
 * Threshold de reclamação (limitado 75–90).
 * `recentFalsePositives` vem de `getRecentComplaintStats()` (memória por processo, aiAnalyticsService).
 * @param {number} [base=82]
 * @param {number} [recentFalsePositives=0]
 */
function adjustComplaintThreshold(base = 82, recentFalsePositives = 0) {
  const b = Number(base);
  const baseClamped = Number.isFinite(b) ? Math.max(75, Math.min(90, b)) : 82;
  const fp = Math.max(0, Math.floor(Number(recentFalsePositives) || 0));
  if (fp > 5) return Math.min(90, baseClamped + 5);
  if (fp === 0) return Math.max(75, baseClamped - 2);
  return baseClamped;
}

module.exports = {
  isAdaptiveTuningEnabled,
  isSupervisedLearningApplyEnabled,
  isStrategicLearningApplyEnabled,
  isStrategicRolloutEnabled,
  getStrategicRolloutProbability,
  shouldApplyStrategicAdjustment,
  adjustConfidence,
  adjustComplaintThreshold,
  mergeApprovedAdjustments,
  mergeAutonomousOptimizationPatch,
  rollbackAutonomousOptimizationConfidence,
  clearApprovedLearningAdjustments,
  getApprovedLearningAdjustments,
  applyApprovedAdjustments,
  applyStrategicAdjustments
};
