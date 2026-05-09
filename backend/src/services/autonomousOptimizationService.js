'use strict';

/**
 * Fase 9 — auto-otimização controlada: só com estratégias humanas pré-aprovadas;
 * passos limitados; rollback automático disponível; sem alterar pipeline/council/prompts.
 * Ciclo periódico: usar `runAutonomousEvaluationCycle` em aiAnalyticsService (cron futuro).
 */

const MAX_CONFIDENCE_REDUCTION = 0.15;
const MIN_CONFIDENCE_FACTOR = 0.75;
const PER_CYCLE_STEP = 0.02;

const { getPreviouslyApprovedStrategies } = require('./supervisedLearningService');
const adaptiveTuningService = require('./adaptiveTuningService');
const { recordAutonomousEvent } = require('./learningMemoryService');
const cognitivePersistence = require('./cognitivePersistenceService');
const cognitiveDbPersistence = require('./cognitiveDbPersistenceService');

const autonomousState = {
  enabled: true,
  activeAdjustments: [],
  rollbackHistory: []
};

function isAutonomousOptimizationEnabled() {
  return String(process.env.IMPETUS_AUTONOMOUS_OPTIMIZATION_ENABLED ?? '')
    .trim()
    .toLowerCase() === 'true';
}

function canApplyAutonomousAdjustment(_type) {
  return autonomousState.enabled && isAutonomousOptimizationEnabled();
}

function effectiveConfidenceFloor() {
  return Math.max(MIN_CONFIDENCE_FACTOR, 1 - MAX_CONFIDENCE_REDUCTION);
}

/**
 * Uma iteração de descida controlada do confidenceFactor (nunca aumenta).
 * @returns {number|null}
 */
function evaluateAutonomousOptimization() {
  if (!canApplyAutonomousAdjustment()) {
    try {
      console.log('[AUTONOMOUS_SKIPPED]', { reason: 'not_enabled' });
    } catch (_e) {}
    return null;
  }

  const approved = getPreviouslyApprovedStrategies();
  if (!approved.length) {
    try {
      console.log('[AUTONOMOUS_SKIPPED]', { reason: 'no_prior_approved_strategy' });
    } catch (_e) {}
    return null;
  }

  const current = adaptiveTuningService.getApprovedLearningAdjustments();
  let confidenceFactor =
    typeof current.confidenceFactor === 'number' && Number.isFinite(current.confidenceFactor)
      ? current.confidenceFactor
      : 1;

  const floor = effectiveConfidenceFloor();
  let nextFactor = confidenceFactor - PER_CYCLE_STEP;
  nextFactor = Math.max(floor, nextFactor);

  if (nextFactor >= confidenceFactor - 1e-9) {
    try {
      console.log('[AUTONOMOUS_SKIPPED]', {
        reason: 'no_decrease_possible',
        confidenceFactor,
        floor
      });
    } catch (_e) {}
    return null;
  }

  const step = confidenceFactor - nextFactor;
  if (step > PER_CYCLE_STEP + 1e-9) {
    try {
      console.log('[AUTONOMOUS_SKIPPED]', { reason: 'step_exceeds_cap', step, PER_CYCLE_STEP });
    } catch (_e) {}
    return null;
  }

  const applied = adaptiveTuningService.mergeAutonomousOptimizationPatch({
    confidenceFactor: nextFactor
  });
  if (!applied) {
    try {
      console.log('[AUTONOMOUS_SKIPPED]', { reason: 'patch_rejected' });
    } catch (_e) {}
    return null;
  }

  autonomousState.activeAdjustments.push({
    timestamp: Date.now(),
    previous: confidenceFactor,
    next: nextFactor
  });

  try {
    recordAutonomousEvent({ op: 'optimize', previous: confidenceFactor, next: nextFactor, floor });
  } catch (_e) {}

  try {
    console.log('[AUTONOMOUS_OPTIMIZATION]', {
      previous: confidenceFactor,
      next: nextFactor,
      floor
    });
  } catch (_e) {}

  try {
    cognitivePersistence.appendAutonomousEvent({
      type: 'optimization',
      details: { previous: confidenceFactor, next: nextFactor, floor }
    });
  } catch (_e) {}

  cognitiveDbPersistence.schedulePersistAutonomousEventToDb({
    type: 'optimization',
    timestamp: Date.now(),
    details: { previous: confidenceFactor, next: nextFactor, floor }
  });

  return nextFactor;
}

function shouldRollback(metrics = {}) {
  const r = metrics.lowConfidenceRate;
  return typeof r === 'number' && Number.isFinite(r) && r > 0.6;
}

function rollbackAutonomousAdjustments() {
  adaptiveTuningService.rollbackAutonomousOptimizationConfidence();
  autonomousState.rollbackHistory.push({ timestamp: Date.now() });
  try {
    recordAutonomousEvent({ op: 'rollback' });
  } catch (_e) {}
  try {
    console.log('[AUTONOMOUS_ROLLBACK]', { timestamp: Date.now() });
  } catch (_e) {}

  try {
    cognitivePersistence.appendAutonomousEvent({
      type: 'rollback',
      details: { at: Date.now() }
    });
  } catch (_e) {}

  cognitiveDbPersistence.schedulePersistAutonomousEventToDb({
    type: 'rollback',
    timestamp: Date.now(),
    details: { at: Date.now() }
  });
}

module.exports = {
  MAX_CONFIDENCE_REDUCTION,
  MIN_CONFIDENCE_FACTOR,
  PER_CYCLE_STEP,
  autonomousState,
  isAutonomousOptimizationEnabled,
  canApplyAutonomousAdjustment,
  effectiveConfidenceFloor,
  evaluateAutonomousOptimization,
  shouldRollback,
  rollbackAutonomousAdjustments
};
