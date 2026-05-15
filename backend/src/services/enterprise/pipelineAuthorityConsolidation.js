'use strict';

/**
 * IMPETUS — Pipeline Authority Consolidation (Consolidação F2)
 *
 * Transforma o event pipeline de observador para backbone dominante com
 * authority gradual em 5 modos:
 *   observe  → apenas mede
 *   shadow   → simula decisões sem aplicar
 *   assist   → recomenda ao operador/sistema
 *   partial_authority → governa channels selecionados
 *   full_authority    → governa todo o runtime
 *
 * IMPORTANTE: NÃO ativar full_authority agora. Default: shadow.
 * Feature flag: IMPETUS_PIPELINE_AUTHORITY_CONSOLIDATION_MODE (default: shadow)
 */

const { v4: uuidv4 } = require('uuid');

const AUTHORITY_MODES = Object.freeze({
  OBSERVE: 'observe',
  SHADOW: 'shadow',
  ASSIST: 'assist',
  PARTIAL_AUTHORITY: 'partial_authority',
  FULL_AUTHORITY: 'full_authority'
});

const VALID_MODES = new Set(Object.values(AUTHORITY_MODES));

const PARTIAL_AUTHORITY_CHANNELS = Object.freeze(new Set([
  'dashboard_chat',
  'ai_action',
  'scheduled'
]));

const _recommendations = [];
const _shadowDecisions = [];
const _authorityDecisions = [];
const MAX_RECORDS = 3000;

let _observationsTotal = 0;
let _shadowDecisionsTotal = 0;
let _recommendationsTotal = 0;
let _authorityDecisionsTotal = 0;
let _divergencesDetected = 0;

function getMode() {
  const raw = String(process.env.IMPETUS_PIPELINE_AUTHORITY_CONSOLIDATION_MODE || 'shadow').trim().toLowerCase();
  return VALID_MODES.has(raw) ? raw : AUTHORITY_MODES.SHADOW;
}

function getModeLevel() {
  const levels = {
    [AUTHORITY_MODES.OBSERVE]: 0,
    [AUTHORITY_MODES.SHADOW]: 1,
    [AUTHORITY_MODES.ASSIST]: 2,
    [AUTHORITY_MODES.PARTIAL_AUTHORITY]: 3,
    [AUTHORITY_MODES.FULL_AUTHORITY]: 4
  };
  return levels[getMode()] || 0;
}

/**
 * Ponto de decisão pipeline: determina o que o pipeline pode fazer neste fluxo.
 */
function evaluateAuthority(context = {}) {
  const mode = getMode();
  const channel = String(context.channel || 'unknown').toLowerCase();
  const pipelineConfidence = context.pipeline_confidence || 0;

  const evaluation = {
    evaluation_id: uuidv4(),
    mode,
    channel,
    pipeline_confidence: pipelineConfidence,
    timestamp: new Date().toISOString(),
    can_observe: true,
    can_shadow: false,
    can_recommend: false,
    can_govern: false,
    recommendation: null,
    shadow_decision: null
  };

  _observationsTotal++;

  if (mode === AUTHORITY_MODES.OBSERVE) {
    return evaluation;
  }

  if (getModeLevel() >= 1) {
    evaluation.can_shadow = true;
    const shadowResult = _computeShadowDecision(context);
    evaluation.shadow_decision = shadowResult;
    _shadowDecisionsTotal++;
    _pushRecord(_shadowDecisions, shadowResult);
  }

  if (getModeLevel() >= 2) {
    evaluation.can_recommend = true;
    const rec = _buildRecommendation(context, evaluation.shadow_decision);
    evaluation.recommendation = rec;
    _recommendationsTotal++;
    _pushRecord(_recommendations, rec);
  }

  if (getModeLevel() >= 3) {
    if (mode === AUTHORITY_MODES.PARTIAL_AUTHORITY) {
      evaluation.can_govern = PARTIAL_AUTHORITY_CHANNELS.has(channel);
    } else if (mode === AUTHORITY_MODES.FULL_AUTHORITY) {
      evaluation.can_govern = true;
    }

    if (evaluation.can_govern) {
      _authorityDecisionsTotal++;
      _pushRecord(_authorityDecisions, {
        decision_id: uuidv4(),
        channel,
        action: 'govern',
        confidence: pipelineConfidence,
        timestamp: evaluation.timestamp
      });
    }
  }

  return evaluation;
}

function _computeShadowDecision(context) {
  const confidence = context.pipeline_confidence || 0;
  const errorRate = context.error_rate || 0;
  const latency = context.latency_ms || 0;

  let suggestedTarget = 'gpt';
  if (confidence > 0.9) suggestedTarget = 'primary';
  else if (confidence > 0.7) suggestedTarget = context.current_target || 'gpt';
  else if (errorRate > 0.2) suggestedTarget = 'fallback';
  else if (latency > 3000) suggestedTarget = 'local';

  let shouldEscalate = false;
  if (confidence < 0.4) shouldEscalate = true;
  if (errorRate > 0.3) shouldEscalate = true;

  return {
    decision_id: uuidv4(),
    suggested_target: suggestedTarget,
    should_escalate: shouldEscalate,
    confidence,
    divergence_from_actual: context.actual_target
      ? (suggestedTarget !== context.actual_target)
      : null,
    timestamp: new Date().toISOString()
  };
}

function _buildRecommendation(context, shadowDecision) {
  const rec = {
    recommendation_id: uuidv4(),
    type: 'runtime_recommendation',
    timestamp: new Date().toISOString(),
    actions: []
  };

  if (shadowDecision && shadowDecision.should_escalate) {
    rec.actions.push({
      action: 'escalate',
      reason: 'low_confidence_or_high_errors',
      priority: 'high'
    });
  }

  if (shadowDecision && shadowDecision.divergence_from_actual === true) {
    _divergencesDetected++;
    rec.actions.push({
      action: 'switch_target',
      suggested: shadowDecision.suggested_target,
      reason: 'shadow_divergence',
      priority: 'medium'
    });
  }

  if (context.saturation && context.saturation > 0.8) {
    rec.actions.push({
      action: 'reduce_load',
      reason: 'saturation_high',
      priority: 'high'
    });
  }

  if (context.governance_pressure && context.governance_pressure > 0.7) {
    rec.actions.push({
      action: 'simplify_arbitration',
      reason: 'governance_overload',
      priority: 'medium'
    });
  }

  if (!rec.actions.length) {
    rec.actions.push({ action: 'no_change', reason: 'stable', priority: 'low' });
  }

  return rec;
}

function _pushRecord(arr, record) {
  arr.push(record);
  if (arr.length > MAX_RECORDS) arr.splice(0, arr.length - MAX_RECORDS);
}

function getRecommendations(limit = 30) {
  return _recommendations.slice(-Math.min(limit, 200));
}

function getShadowDecisions(limit = 30) {
  return _shadowDecisions.slice(-Math.min(limit, 200));
}

function getAuthorityDecisions(limit = 30) {
  return _authorityDecisions.slice(-Math.min(limit, 200));
}

function getDivergenceRate() {
  if (_shadowDecisionsTotal === 0) return 0;
  return Math.round((_divergencesDetected / _shadowDecisionsTotal) * 10000) / 100;
}

function getMetrics() {
  return {
    mode: getMode(),
    mode_level: getModeLevel(),
    observations_total: _observationsTotal,
    shadow_decisions_total: _shadowDecisionsTotal,
    recommendations_total: _recommendationsTotal,
    authority_decisions_total: _authorityDecisionsTotal,
    divergences_detected: _divergencesDetected,
    divergence_rate_pct: getDivergenceRate()
  };
}

function getHealth() {
  const m = getMetrics();
  return {
    status: m.mode === 'full_authority' ? 'full_authority'
      : m.divergence_rate_pct > 30 ? 'high_divergence'
      : 'healthy',
    metrics: m
  };
}

module.exports = {
  AUTHORITY_MODES,
  PARTIAL_AUTHORITY_CHANNELS,
  getMode,
  getModeLevel,
  evaluateAuthority,
  getRecommendations,
  getShadowDecisions,
  getAuthorityDecisions,
  getDivergenceRate,
  getMetrics,
  getHealth
};
