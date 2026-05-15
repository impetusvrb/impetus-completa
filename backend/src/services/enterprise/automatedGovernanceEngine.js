'use strict';

/**
 * IMPETUS — Automated Governance Engine (Fase 8)
 * Governance ativa: ações automáticas, falha preditiva, políticas de estabilidade.
 *
 * Integra: adaptiveGovernanceEngine, governanceAlertService,
 * eventPipelineGovernanceService, cognitivePolicyArbitrationService.
 *
 * Feature flag: IMPETUS_AUTOMATED_GOVERNANCE_ENABLED (default: false)
 */

const { v4: uuidv4 } = require('uuid');

const GOV_ENABLED =
  String(process.env.IMPETUS_AUTOMATED_GOVERNANCE_ENABLED || 'false').trim().toLowerCase() === 'true';

const ACTIONS = Object.freeze({
  REDUCE_AUTONOMY: 'reduce_autonomy',
  AUTO_ROLLBACK: 'auto_rollback',
  COGNITIVE_ISOLATION: 'cognitive_isolation',
  DEGRADE_MODE: 'degrade_mode',
  ALERT: 'alert',
  ESCALATE_HUMAN: 'escalate_human',
  NO_ACTION: 'no_action'
});

const STABILITY_POLICIES = Object.freeze({
  CSI_CRITICAL: {
    trigger: 'csi_below_threshold',
    threshold: 0.4,
    action: ACTIONS.REDUCE_AUTONOMY,
    severity: 'critical'
  },
  ERROR_RATE_HIGH: {
    trigger: 'error_rate_exceeded',
    threshold: 0.25,
    action: ACTIONS.DEGRADE_MODE,
    severity: 'high'
  },
  LATENCY_SATURATION: {
    trigger: 'latency_p99_exceeded',
    threshold: 5000,
    action: ACTIONS.COGNITIVE_ISOLATION,
    severity: 'high'
  },
  DRIFT_EXCESSIVE: {
    trigger: 'cognitive_drift_exceeded',
    threshold: 0.3,
    action: ACTIONS.AUTO_ROLLBACK,
    severity: 'critical'
  },
  CONFIDENCE_COLLAPSE: {
    trigger: 'confidence_below_floor',
    threshold: 0.2,
    action: ACTIONS.ESCALATE_HUMAN,
    severity: 'critical'
  }
});

const _actionLog = [];
const _predictiveAlerts = [];
const _governanceState = {
  autonomy_level: 1.0,
  degraded_mode: false,
  isolated_subsystems: new Set(),
  last_evaluation: null
};
const MAX_ACTION_LOG = 3000;
const MAX_PREDICTIVE_ALERTS = 500;

let _actionsExecuted = 0;
let _predictionsGenerated = 0;
let _autonomyReductions = 0;
let _rollbacksTriggered = 0;

/**
 * Governance Action Engine (Fase 8.1)
 * Avalia condições e executa ações automáticas.
 */
function evaluate(signals = {}) {
  if (!GOV_ENABLED) {
    return { actions: [], governance_enabled: false, mode: 'observation' };
  }

  const actions = [];
  _governanceState.last_evaluation = new Date().toISOString();

  for (const [policyName, policy] of Object.entries(STABILITY_POLICIES)) {
    const signalValue = signals[policy.trigger];
    if (signalValue == null) continue;

    let triggered = false;

    if (policy.trigger.includes('below') || policy.trigger.includes('collapse')) {
      triggered = signalValue < policy.threshold;
    } else {
      triggered = signalValue > policy.threshold;
    }

    if (triggered) {
      const action = _executeAction(policy.action, {
        policy: policyName,
        trigger: policy.trigger,
        signal_value: signalValue,
        threshold: policy.threshold,
        severity: policy.severity
      });
      actions.push(action);
    }
  }

  return { actions, governance_enabled: true, autonomy_level: _governanceState.autonomy_level };
}

function _executeAction(actionType, context) {
  const action = {
    action_id: uuidv4(),
    type: actionType,
    context,
    executed_at: new Date().toISOString(),
    result: null
  };

  switch (actionType) {
    case ACTIONS.REDUCE_AUTONOMY: {
      const prev = _governanceState.autonomy_level;
      _governanceState.autonomy_level = Math.max(0.1, prev - 0.2);
      _autonomyReductions++;
      action.result = { previous: prev, current: _governanceState.autonomy_level };
      break;
    }
    case ACTIONS.DEGRADE_MODE:
      _governanceState.degraded_mode = true;
      action.result = { degraded_mode: true };
      break;
    case ACTIONS.COGNITIVE_ISOLATION:
      if (context.subsystem) _governanceState.isolated_subsystems.add(context.subsystem);
      action.result = { isolated: context.subsystem || 'unknown' };
      break;
    case ACTIONS.AUTO_ROLLBACK:
      _rollbacksTriggered++;
      action.result = { rollback_triggered: true, reason: context.trigger };
      break;
    case ACTIONS.ESCALATE_HUMAN:
      action.result = { escalated: true, reason: context.trigger };
      break;
    case ACTIONS.ALERT:
      action.result = { alert_created: true };
      break;
    default:
      action.result = { no_action: true };
  }

  _actionLog.push(action);
  if (_actionLog.length > MAX_ACTION_LOG) _actionLog.splice(0, _actionLog.length - MAX_ACTION_LOG);
  _actionsExecuted++;

  return action;
}

/**
 * Predictive Cognitive Failure (Fase 8.2)
 * Analisa tendências para prever falhas futuras.
 */
function predictFailure(trendData = {}) {
  const predictions = [];
  _predictionsGenerated++;

  if (trendData.error_rate_trend && trendData.error_rate_trend.length >= 5) {
    const trend = trendData.error_rate_trend;
    const avg = trend.reduce((s, v) => s + v, 0) / trend.length;
    const recent = trend.slice(-3).reduce((s, v) => s + v, 0) / 3;

    if (recent > avg * 1.5 && recent > 0.1) {
      predictions.push({
        prediction_id: uuidv4(),
        type: 'error_rate_escalation',
        severity: 'high',
        confidence: Math.min(0.95, (recent / avg) * 0.5),
        message: `Taxa de erro crescente: média ${(avg * 100).toFixed(1)}% → recente ${(recent * 100).toFixed(1)}%`,
        recommended_action: ACTIONS.DEGRADE_MODE,
        predicted_at: new Date().toISOString()
      });
    }
  }

  if (trendData.latency_trend && trendData.latency_trend.length >= 5) {
    const trend = trendData.latency_trend;
    const avg = trend.reduce((s, v) => s + v, 0) / trend.length;
    const recent = trend.slice(-3).reduce((s, v) => s + v, 0) / 3;

    if (recent > avg * 2 && recent > 2000) {
      predictions.push({
        prediction_id: uuidv4(),
        type: 'latency_saturation',
        severity: 'high',
        confidence: Math.min(0.9, (recent / avg) * 0.4),
        message: `Latência em escalada: média ${Math.round(avg)}ms → recente ${Math.round(recent)}ms`,
        recommended_action: ACTIONS.COGNITIVE_ISOLATION,
        predicted_at: new Date().toISOString()
      });
    }
  }

  if (trendData.confidence_trend && trendData.confidence_trend.length >= 5) {
    const trend = trendData.confidence_trend;
    const recent = trend.slice(-3).reduce((s, v) => s + v, 0) / 3;

    if (recent < 0.4) {
      predictions.push({
        prediction_id: uuidv4(),
        type: 'confidence_degradation',
        severity: 'critical',
        confidence: 0.8,
        message: `Confiança em queda: média recente ${(recent * 100).toFixed(1)}%`,
        recommended_action: ACTIONS.REDUCE_AUTONOMY,
        predicted_at: new Date().toISOString()
      });
    }
  }

  for (const p of predictions) {
    _predictiveAlerts.push(p);
    if (_predictiveAlerts.length > MAX_PREDICTIVE_ALERTS) {
      _predictiveAlerts.splice(0, _predictiveAlerts.length - MAX_PREDICTIVE_ALERTS);
    }
  }

  return predictions;
}

function restoreAutonomy(level) {
  const clamped = Math.max(0.1, Math.min(1.0, level || 1.0));
  const prev = _governanceState.autonomy_level;
  _governanceState.autonomy_level = clamped;
  _governanceState.degraded_mode = false;
  return { previous: prev, current: clamped };
}

function getGovernanceState() {
  return {
    autonomy_level: _governanceState.autonomy_level,
    degraded_mode: _governanceState.degraded_mode,
    isolated_subsystems: Array.from(_governanceState.isolated_subsystems),
    last_evaluation: _governanceState.last_evaluation
  };
}

function getRecentActions(limit = 50) {
  return _actionLog.slice(-Math.min(limit, 500));
}

function getPredictiveAlerts(limit = 20) {
  return _predictiveAlerts.slice(-Math.min(limit, 100));
}

function getMetrics() {
  return {
    actions_executed: _actionsExecuted,
    predictions_generated: _predictionsGenerated,
    autonomy_reductions: _autonomyReductions,
    rollbacks_triggered: _rollbacksTriggered,
    current_autonomy: _governanceState.autonomy_level,
    degraded_mode: _governanceState.degraded_mode,
    governance_enabled: GOV_ENABLED
  };
}

function getHealth() {
  const m = getMetrics();
  return {
    status: !GOV_ENABLED ? 'observation_only'
      : m.degraded_mode ? 'degraded'
      : m.current_autonomy < 0.5 ? 'reduced_autonomy'
      : 'healthy',
    metrics: m,
    state: getGovernanceState()
  };
}

module.exports = {
  ACTIONS,
  STABILITY_POLICIES,
  GOV_ENABLED,
  evaluate,
  predictFailure,
  restoreAutonomy,
  getGovernanceState,
  getRecentActions,
  getPredictiveAlerts,
  getMetrics,
  getHealth
};
