'use strict';

/**
 * IMPETUS — Adaptive Cognition Engine (Fase 7)
 * Feedback de confiança, learning governance e adaptação supervisionada.
 *
 * Integra: confidenceCalibrationService, adaptiveTuningService,
 * supervisedLearningService, learningMemoryService.
 *
 * Feature flag: IMPETUS_ADAPTIVE_COGNITION_ENABLED (default: false — observação)
 */

const { v4: uuidv4 } = require('uuid');

const ADAPTIVE_ENABLED =
  String(process.env.IMPETUS_ADAPTIVE_COGNITION_ENABLED || 'false').trim().toLowerCase() === 'true';

const ADAPTATION_POLICIES = Object.freeze({
  CONSERVATIVE: 'conservative',
  MODERATE: 'moderate',
  AGGRESSIVE: 'aggressive'
});

const LEARNING_GUARDS = Object.freeze({
  MAX_WEIGHT_DELTA: 0.1,
  MIN_CONFIDENCE_FLOOR: 0.3,
  MAX_CONFIDENCE_CEILING: 0.98,
  MIN_SAMPLES_FOR_ADAPTATION: 20,
  REGRESSION_DETECTION_WINDOW: 50,
  REGRESSION_THRESHOLD: 0.15
});

const _feedbackLog = [];
const _adaptationHistory = [];
const _weights = new Map();
const MAX_FEEDBACK = 5000;
const MAX_ADAPTATION_HISTORY = 2000;

let _feedbackReceived = 0;
let _adaptationsApplied = 0;
let _regressionsDetected = 0;
let _adaptationsBlocked = 0;

function _getPolicy() {
  const raw = String(process.env.IMPETUS_ADAPTATION_POLICY || 'conservative').trim().toLowerCase();
  return Object.values(ADAPTATION_POLICIES).includes(raw) ? raw : ADAPTATION_POLICIES.CONSERVATIVE;
}

function getWeight(key) {
  return _weights.get(key) || { key, value: 0.5, samples: 0, last_updated: null };
}

function setWeight(key, value) {
  const clamped = Math.max(LEARNING_GUARDS.MIN_CONFIDENCE_FLOOR, Math.min(LEARNING_GUARDS.MAX_CONFIDENCE_CEILING, value));
  _weights.set(key, {
    key,
    value: Math.round(clamped * 10000) / 10000,
    samples: (getWeight(key).samples || 0) + 1,
    last_updated: new Date().toISOString()
  });
}

/**
 * Confidence Feedback Engine (Fase 7.1)
 * Recebe feedback sobre confiança observada e ajusta pesos.
 */
function submitFeedback(feedback) {
  if (!feedback || typeof feedback !== 'object') return { accepted: false };

  const entry = {
    feedback_id: uuidv4(),
    key: feedback.key || 'global',
    observed_confidence: feedback.observed_confidence != null ? feedback.observed_confidence : null,
    expected_confidence: feedback.expected_confidence != null ? feedback.expected_confidence : null,
    outcome_quality: feedback.outcome_quality != null ? feedback.outcome_quality : null,
    source: feedback.source || 'system',
    timestamp: new Date().toISOString()
  };

  _feedbackLog.push(entry);
  if (_feedbackLog.length > MAX_FEEDBACK) _feedbackLog.splice(0, _feedbackLog.length - MAX_FEEDBACK);
  _feedbackReceived++;

  if (ADAPTIVE_ENABLED) {
    _tryAdapt(entry);
  }

  return { accepted: true, feedback_id: entry.feedback_id, adaptive_enabled: ADAPTIVE_ENABLED };
}

function _tryAdapt(feedback) {
  const current = getWeight(feedback.key);
  const policy = _getPolicy();

  if (current.samples < LEARNING_GUARDS.MIN_SAMPLES_FOR_ADAPTATION) {
    return;
  }

  if (_detectRegression(feedback.key)) {
    _regressionsDetected++;
    _adaptationsBlocked++;
    _recordAdaptation(feedback.key, 'blocked', current.value, current.value, 'regression_detected');
    return;
  }

  let alpha;
  switch (policy) {
    case ADAPTATION_POLICIES.AGGRESSIVE: alpha = 0.15; break;
    case ADAPTATION_POLICIES.MODERATE: alpha = 0.08; break;
    case ADAPTATION_POLICIES.CONSERVATIVE:
    default: alpha = 0.03;
  }

  if (feedback.observed_confidence != null && feedback.expected_confidence != null) {
    const error = feedback.expected_confidence - feedback.observed_confidence;
    const delta = error * alpha;
    const clampedDelta = Math.max(-LEARNING_GUARDS.MAX_WEIGHT_DELTA, Math.min(LEARNING_GUARDS.MAX_WEIGHT_DELTA, delta));
    const newValue = current.value + clampedDelta;

    setWeight(feedback.key, newValue);
    _adaptationsApplied++;
    _recordAdaptation(feedback.key, 'applied', current.value, newValue, `alpha=${alpha},delta=${clampedDelta.toFixed(4)}`);
  }
}

function _detectRegression(key) {
  const recentFeedback = _feedbackLog
    .filter(f => f.key === key)
    .slice(-LEARNING_GUARDS.REGRESSION_DETECTION_WINDOW);

  if (recentFeedback.length < LEARNING_GUARDS.REGRESSION_DETECTION_WINDOW / 2) return false;

  const half = Math.floor(recentFeedback.length / 2);
  const firstHalf = recentFeedback.slice(0, half);
  const secondHalf = recentFeedback.slice(half);

  const avg = arr => {
    const valid = arr.filter(f => f.outcome_quality != null);
    return valid.length ? valid.reduce((s, f) => s + f.outcome_quality, 0) / valid.length : null;
  };

  const avgFirst = avg(firstHalf);
  const avgSecond = avg(secondHalf);

  if (avgFirst == null || avgSecond == null) return false;

  return (avgFirst - avgSecond) > LEARNING_GUARDS.REGRESSION_THRESHOLD;
}

function _recordAdaptation(key, action, oldValue, newValue, reason) {
  _adaptationHistory.push({
    adaptation_id: uuidv4(),
    key,
    action,
    old_value: oldValue,
    new_value: newValue,
    reason,
    policy: _getPolicy(),
    timestamp: new Date().toISOString()
  });

  if (_adaptationHistory.length > MAX_ADAPTATION_HISTORY) {
    _adaptationHistory.splice(0, _adaptationHistory.length - MAX_ADAPTATION_HISTORY);
  }
}

/**
 * Learning Governance Layer (Fase 7.2)
 * Verifica se uma adaptação proposta é segura.
 */
function validateAdaptation(key, proposedValue) {
  const current = getWeight(key);
  const delta = Math.abs(proposedValue - current.value);

  const issues = [];

  if (delta > LEARNING_GUARDS.MAX_WEIGHT_DELTA * 2) {
    issues.push(`delta ${delta.toFixed(4)} excede limite seguro (${LEARNING_GUARDS.MAX_WEIGHT_DELTA * 2})`);
  }

  if (proposedValue < LEARNING_GUARDS.MIN_CONFIDENCE_FLOOR) {
    issues.push(`valor ${proposedValue} abaixo do floor (${LEARNING_GUARDS.MIN_CONFIDENCE_FLOOR})`);
  }

  if (proposedValue > LEARNING_GUARDS.MAX_CONFIDENCE_CEILING) {
    issues.push(`valor ${proposedValue} acima do ceiling (${LEARNING_GUARDS.MAX_CONFIDENCE_CEILING})`);
  }

  if (_detectRegression(key)) {
    issues.push('regressão detectada — adaptação bloqueada');
  }

  return {
    safe: issues.length === 0,
    issues,
    current_value: current.value,
    proposed_value: proposedValue,
    delta
  };
}

function getAdaptationHistory(key, limit = 50) {
  let filtered = _adaptationHistory;
  if (key) filtered = filtered.filter(a => a.key === key);
  return filtered.slice(-Math.min(limit, 500));
}

function getAllWeights() {
  return Array.from(_weights.values());
}

function getMetrics() {
  return {
    feedback_received: _feedbackReceived,
    adaptations_applied: _adaptationsApplied,
    regressions_detected: _regressionsDetected,
    adaptations_blocked: _adaptationsBlocked,
    weights_tracked: _weights.size,
    policy: _getPolicy(),
    adaptive_enabled: ADAPTIVE_ENABLED
  };
}

function getHealth() {
  const m = getMetrics();
  const blockRate = m.feedback_received > 0 ? m.adaptations_blocked / m.feedback_received : 0;

  return {
    status: !ADAPTIVE_ENABLED ? 'observation_only'
      : blockRate > 0.5 ? 'degraded'
      : m.regressions_detected > 10 ? 'warning'
      : 'healthy',
    metrics: m,
    block_rate_pct: Math.round(blockRate * 10000) / 100
  };
}

module.exports = {
  ADAPTATION_POLICIES,
  LEARNING_GUARDS,
  ADAPTIVE_ENABLED,
  submitFeedback,
  validateAdaptation,
  getWeight,
  setWeight,
  getAllWeights,
  getAdaptationHistory,
  getMetrics,
  getHealth
};
