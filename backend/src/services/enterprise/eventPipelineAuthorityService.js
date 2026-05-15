'use strict';

/**
 * IMPETUS — Event Pipeline Authority Service (Fase 4)
 * Pipeline governa o runtime: decisão, arbitragem, routing cognitivo e kill switch.
 *
 * Integra: cognitiveEntrypointRegistry (authority mode),
 * unifiedOrchestrator (routing), cognitiveEventBackboneService (eventos).
 *
 * Feature flag: IMPETUS_PIPELINE_AUTHORITY_ENABLED (default: false — shadow)
 */

const { v4: uuidv4 } = require('uuid');

const AUTHORITY_ENABLED =
  String(process.env.IMPETUS_PIPELINE_AUTHORITY_ENABLED || 'false').trim().toLowerCase() === 'true';

const RUNTIME_TARGETS = Object.freeze({
  GPT: 'gpt',
  CLAUDE: 'claude',
  GEMINI: 'gemini',
  SANDBOX: 'sandbox',
  FALLBACK: 'fallback',
  LOCAL: 'local'
});

const ARBITRATION_STRATEGIES = Object.freeze({
  CONFIDENCE_FIRST: 'confidence_first',
  LATENCY_FIRST: 'latency_first',
  COST_FIRST: 'cost_first',
  QUALITY_FIRST: 'quality_first',
  BALANCED: 'balanced'
});

const DECISION_TYPES = Object.freeze({
  SOURCE_SELECTION: 'source_selection',
  FALLBACK: 'fallback',
  DEGRADATION: 'degradation',
  ESCALATION: 'escalation',
  KILL_SWITCH: 'kill_switch'
});

const _decisions = [];
const _killSwitchState = { active: false, activated_at: null, reason: null, activated_by: null };
const MAX_DECISIONS = 3000;

let _decisionsTotal = 0;
let _fallbacksTriggered = 0;
let _escalationsTriggered = 0;
let _killSwitchActivations = 0;

const _runtimeScores = new Map();

function _initRuntimeScores() {
  for (const target of Object.values(RUNTIME_TARGETS)) {
    _runtimeScores.set(target, {
      target,
      confidence_avg: 0.8,
      latency_avg_ms: 500,
      cost_per_call: 0.01,
      quality_score: 80,
      failure_rate: 0.02,
      calls_total: 0,
      last_updated: null
    });
  }
}
_initRuntimeScores();

/**
 * Atualiza scores de runtime com base em resultado observado.
 */
function updateRuntimeScore(target, observation) {
  const score = _runtimeScores.get(target);
  if (!score) return;

  const alpha = 0.1;
  if (observation.confidence != null) {
    score.confidence_avg = score.confidence_avg * (1 - alpha) + observation.confidence * alpha;
  }
  if (observation.latency_ms != null) {
    score.latency_avg_ms = score.latency_avg_ms * (1 - alpha) + observation.latency_ms * alpha;
  }
  if (observation.quality_score != null) {
    score.quality_score = score.quality_score * (1 - alpha) + observation.quality_score * alpha;
  }
  if (observation.failed) {
    score.failure_rate = score.failure_rate * 0.95 + 0.05;
  } else {
    score.failure_rate = score.failure_rate * 0.95;
  }

  score.calls_total++;
  score.last_updated = new Date().toISOString();
}

/**
 * Arbitragem: seleciona o melhor runtime para uma tarefa.
 */
function arbitrate(context = {}) {
  const strategy = context.strategy || ARBITRATION_STRATEGIES.BALANCED;
  const candidates = Array.from(_runtimeScores.values()).filter(s => s.failure_rate < 0.5);

  if (_killSwitchState.active) {
    return _recordDecision(DECISION_TYPES.KILL_SWITCH, {
      selected: RUNTIME_TARGETS.FALLBACK,
      reason: 'kill_switch_active',
      strategy
    });
  }

  if (!candidates.length) {
    return _recordDecision(DECISION_TYPES.FALLBACK, {
      selected: RUNTIME_TARGETS.FALLBACK,
      reason: 'no_healthy_candidates',
      strategy
    });
  }

  let scored;
  switch (strategy) {
    case ARBITRATION_STRATEGIES.CONFIDENCE_FIRST:
      scored = candidates.sort((a, b) => b.confidence_avg - a.confidence_avg);
      break;
    case ARBITRATION_STRATEGIES.LATENCY_FIRST:
      scored = candidates.sort((a, b) => a.latency_avg_ms - b.latency_avg_ms);
      break;
    case ARBITRATION_STRATEGIES.COST_FIRST:
      scored = candidates.sort((a, b) => a.cost_per_call - b.cost_per_call);
      break;
    case ARBITRATION_STRATEGIES.QUALITY_FIRST:
      scored = candidates.sort((a, b) => b.quality_score - a.quality_score);
      break;
    case ARBITRATION_STRATEGIES.BALANCED:
    default:
      scored = candidates.sort((a, b) => {
        const scoreA = a.confidence_avg * 40 + (100 - Math.min(a.latency_avg_ms / 50, 100)) * 20
          + a.quality_score * 30 + (1 - a.failure_rate) * 10;
        const scoreB = b.confidence_avg * 40 + (100 - Math.min(b.latency_avg_ms / 50, 100)) * 20
          + b.quality_score * 30 + (1 - b.failure_rate) * 10;
        return scoreB - scoreA;
      });
  }

  const selected = scored[0];
  return _recordDecision(DECISION_TYPES.SOURCE_SELECTION, {
    selected: selected.target,
    reason: `${strategy}_winner`,
    strategy,
    scores: scored.slice(0, 3).map(s => ({ target: s.target, conf: s.confidence_avg, lat: s.latency_avg_ms, qual: s.quality_score })),
    confidence_threshold: context.confidence_threshold || null
  });
}

/**
 * Partial Runtime Control (Fase 4.1)
 */
function shouldPipelineControl(context = {}) {
  if (!AUTHORITY_ENABLED) return { control: false, reason: 'authority_disabled' };
  if (_killSwitchState.active) return { control: false, reason: 'kill_switch_active' };

  const confidence = context.pipeline_confidence || 0;
  const threshold = parseFloat(process.env.IMPETUS_PIPELINE_CONFIDENCE_THRESHOLD || '0.7');

  if (confidence > threshold) {
    return { control: true, reason: 'confidence_above_threshold', confidence, threshold };
  }

  return { control: false, reason: 'confidence_below_threshold', confidence, threshold };
}

/**
 * Kill Switch (Fase 4.4) — rollback instantâneo para fallback.
 */
function activateKillSwitch(reason, activatedBy = 'system') {
  _killSwitchState.active = true;
  _killSwitchState.activated_at = new Date().toISOString();
  _killSwitchState.reason = reason || 'manual_activation';
  _killSwitchState.activated_by = activatedBy;
  _killSwitchActivations++;

  _recordDecision(DECISION_TYPES.KILL_SWITCH, {
    selected: RUNTIME_TARGETS.FALLBACK,
    reason: `kill_switch: ${reason}`,
    strategy: 'emergency'
  });

  return { activated: true, state: { ..._killSwitchState } };
}

function deactivateKillSwitch() {
  const was = { ..._killSwitchState };
  _killSwitchState.active = false;
  _killSwitchState.activated_at = null;
  _killSwitchState.reason = null;
  _killSwitchState.activated_by = null;
  return { deactivated: true, previous_state: was };
}

function getKillSwitchState() {
  return { ..._killSwitchState };
}

function escalate(context = {}) {
  _escalationsTriggered++;
  return _recordDecision(DECISION_TYPES.ESCALATION, {
    selected: context.escalate_to || RUNTIME_TARGETS.CLAUDE,
    reason: context.reason || 'confidence_too_low',
    strategy: 'escalation',
    original_target: context.original_target || null
  });
}

function triggerFallback(context = {}) {
  _fallbacksTriggered++;
  return _recordDecision(DECISION_TYPES.FALLBACK, {
    selected: RUNTIME_TARGETS.FALLBACK,
    reason: context.reason || 'runtime_failure',
    strategy: 'fallback',
    original_target: context.original_target || null
  });
}

function _recordDecision(type, data) {
  const decision = {
    decision_id: uuidv4(),
    type,
    ...data,
    timestamp: new Date().toISOString()
  };

  _decisions.push(decision);
  if (_decisions.length > MAX_DECISIONS) _decisions.splice(0, _decisions.length - MAX_DECISIONS);
  _decisionsTotal++;

  return decision;
}

function getRecentDecisions(limit = 50) {
  return _decisions.slice(-Math.min(limit, 500));
}

function getRuntimeScores() {
  return Array.from(_runtimeScores.values());
}

function getMetrics() {
  return {
    decisions_total: _decisionsTotal,
    fallbacks_triggered: _fallbacksTriggered,
    escalations_triggered: _escalationsTriggered,
    kill_switch_activations: _killSwitchActivations,
    kill_switch_active: _killSwitchState.active,
    authority_enabled: AUTHORITY_ENABLED,
    runtime_targets: _runtimeScores.size
  };
}

function getHealth() {
  const m = getMetrics();
  return {
    status: _killSwitchState.active ? 'kill_switch'
      : !AUTHORITY_ENABLED ? 'shadow'
      : m.fallbacks_triggered > m.decisions_total * 0.3 ? 'degraded'
      : 'healthy',
    metrics: m,
    kill_switch: { ..._killSwitchState }
  };
}

module.exports = {
  RUNTIME_TARGETS,
  ARBITRATION_STRATEGIES,
  DECISION_TYPES,
  AUTHORITY_ENABLED,
  updateRuntimeScore,
  arbitrate,
  shouldPipelineControl,
  activateKillSwitch,
  deactivateKillSwitch,
  getKillSwitchState,
  escalate,
  triggerFallback,
  getRecentDecisions,
  getRuntimeScores,
  getMetrics,
  getHealth
};
