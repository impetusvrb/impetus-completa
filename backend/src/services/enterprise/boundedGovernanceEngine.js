'use strict';

/**
 * IMPETUS — Bounded Governance Engine (Consolidação F7 + F8)
 *
 * Governance assistida + estabilização enterprise.
 * O sistema PODE: sugerir, recomendar, medir, simular, observar.
 * O sistema NÃO PODE: alterar sozinho, mutar policy, auto-promover authority.
 *
 * Responsável por:
 * - Limitar escalada normativa
 * - Evitar cascata de arbitration
 * - Reduzir overload cognitivo
 * - Saturation governance
 *
 * Feature flag: IMPETUS_BOUNDED_GOVERNANCE_ENABLED (default: true)
 */

const { v4: uuidv4 } = require('uuid');

const BOUNDED_GOV_ENABLED = process.env.IMPETUS_BOUNDED_GOVERNANCE_ENABLED !== 'false';

const GOVERNANCE_CAPABILITIES = Object.freeze({
  SUGGEST: 'suggest',
  RECOMMEND: 'recommend',
  MEASURE: 'measure',
  SIMULATE: 'simulate',
  OBSERVE: 'observe'
});

const FORBIDDEN_ACTIONS = Object.freeze([
  'self_modify_policy',
  'auto_promote_authority',
  'autonomous_mutation',
  'runtime_authority_switch',
  'self_governance',
  'self_modifying_runtime'
]);

const SATURATION_LIMITS = Object.freeze({
  MAX_ARBITRATIONS_PER_MIN: 100,
  MAX_POLICY_EVALUATIONS_PER_MIN: 200,
  MAX_GOVERNANCE_DEPTH: 5,
  MAX_CASCADE_CHAIN: 3,
  MAX_CONCURRENT_FLOWS: 50,
  COGNITIVE_OVERLOAD_THRESHOLD: 0.85
});

const _suggestions = [];
const _boundaryViolations = [];
const _saturationEvents = [];
const MAX_RECORDS = 3000;

let _suggestionsGenerated = 0;
let _boundaryChecks = 0;
let _boundaryBlocks = 0;
let _saturationThrottles = 0;
let _cascadesInterrupted = 0;

const _rateLimiters = {
  arbitrations: { count: 0, window_start: Date.now() },
  policy_evaluations: { count: 0, window_start: Date.now() },
  concurrent_flows: 0
};

/**
 * Verifica se uma ação governativa é permitida.
 * Governance assistida: NUNCA permite ações autônomas perigosas.
 */
function checkBoundary(action, context = {}) {
  _boundaryChecks++;

  if (FORBIDDEN_ACTIONS.includes(action)) {
    _boundaryBlocks++;
    _recordBoundaryViolation(action, context, 'forbidden_action');
    return {
      allowed: false,
      reason: `Ação "${action}" é explicitamente proibida pela bounded governance`,
      category: 'forbidden'
    };
  }

  const validCapabilities = Object.values(GOVERNANCE_CAPABILITIES);
  const capability = context.capability || context.action_type;

  if (capability && !validCapabilities.includes(capability)) {
    _boundaryBlocks++;
    _recordBoundaryViolation(action, context, 'invalid_capability');
    return {
      allowed: false,
      reason: `Capability "${capability}" não é reconhecida. Permitidas: ${validCapabilities.join(', ')}`,
      category: 'invalid_capability'
    };
  }

  const saturationCheck = _checkSaturation(context);
  if (!saturationCheck.allowed) {
    _boundaryBlocks++;
    return saturationCheck;
  }

  return { allowed: true, reason: 'within_bounds', capability: capability || 'observe' };
}

function _checkSaturation(context) {
  const now = Date.now();

  if (now - _rateLimiters.arbitrations.window_start > 60000) {
    _rateLimiters.arbitrations = { count: 0, window_start: now };
  }
  if (now - _rateLimiters.policy_evaluations.window_start > 60000) {
    _rateLimiters.policy_evaluations = { count: 0, window_start: now };
  }

  if (context.is_arbitration) {
    _rateLimiters.arbitrations.count++;
    if (_rateLimiters.arbitrations.count > SATURATION_LIMITS.MAX_ARBITRATIONS_PER_MIN) {
      _saturationThrottles++;
      return { allowed: false, reason: 'arbitration_rate_exceeded', category: 'saturation' };
    }
  }

  if (context.is_policy_evaluation) {
    _rateLimiters.policy_evaluations.count++;
    if (_rateLimiters.policy_evaluations.count > SATURATION_LIMITS.MAX_POLICY_EVALUATIONS_PER_MIN) {
      _saturationThrottles++;
      return { allowed: false, reason: 'policy_evaluation_rate_exceeded', category: 'saturation' };
    }
  }

  if (context.governance_depth && context.governance_depth > SATURATION_LIMITS.MAX_GOVERNANCE_DEPTH) {
    _cascadesInterrupted++;
    return { allowed: false, reason: 'governance_depth_exceeded', category: 'cascade_prevention' };
  }

  if (context.cascade_chain && context.cascade_chain > SATURATION_LIMITS.MAX_CASCADE_CHAIN) {
    _cascadesInterrupted++;
    return { allowed: false, reason: 'cascade_chain_exceeded', category: 'cascade_prevention' };
  }

  if (context.cognitive_pressure && context.cognitive_pressure > SATURATION_LIMITS.COGNITIVE_OVERLOAD_THRESHOLD) {
    _saturationThrottles++;
    return { allowed: false, reason: 'cognitive_overload', category: 'saturation' };
  }

  return { allowed: true };
}

/**
 * Gera uma sugestão governativa (NÃO aplica — apenas sugere).
 */
function suggest(type, analysis = {}) {
  _suggestionsGenerated++;

  const suggestion = {
    suggestion_id: uuidv4(),
    type,
    priority: analysis.priority || 'medium',
    analysis: _safeClone(analysis),
    action_recommended: analysis.recommended_action || null,
    rationale: analysis.rationale || null,
    requires_human_approval: true,
    auto_applied: false,
    created_at: new Date().toISOString(),
    status: 'pending'
  };

  _suggestions.push(suggestion);
  if (_suggestions.length > MAX_RECORDS) _suggestions.splice(0, _suggestions.length - MAX_RECORDS);

  return suggestion;
}

/**
 * Simula o impacto de uma mudança governativa SEM aplicar.
 */
function simulate(change, currentState = {}) {
  const simulation = {
    simulation_id: uuidv4(),
    change_description: change.description || 'unknown',
    current_state: _safeClone(currentState),
    projected_impact: {},
    risk_assessment: 'low',
    simulated_at: new Date().toISOString()
  };

  if (change.type === 'authority_promotion') {
    simulation.projected_impact = {
      latency_change: '+5-15%',
      governance_load: '+20-40%',
      divergence_risk: 'medium',
      recommendation: 'Testar em shadow mode por 72h antes de ativar'
    };
    simulation.risk_assessment = 'medium';
  } else if (change.type === 'policy_addition') {
    simulation.projected_impact = {
      evaluation_overhead: '+2-5ms per request',
      cascading_risk: currentState.policies_active > 50 ? 'high' : 'low',
      recommendation: currentState.policies_active > 50
        ? 'Consolidar policies existentes antes de adicionar'
        : 'Seguro para adicionar'
    };
    simulation.risk_assessment = currentState.policies_active > 50 ? 'high' : 'low';
  } else if (change.type === 'load_increase') {
    const currentLoad = currentState.events_per_sec || 0;
    const proposedLoad = change.target_load || currentLoad * 1.5;
    simulation.projected_impact = {
      saturation_projected: Math.min(1, proposedLoad / 200),
      queue_pressure: proposedLoad > 150 ? 'high' : 'normal',
      recommendation: proposedLoad > 150
        ? 'Escalar horizontalmente antes'
        : 'Capacidade suficiente'
    };
    simulation.risk_assessment = proposedLoad > 150 ? 'high' : 'low';
  }

  return simulation;
}

function _recordBoundaryViolation(action, context, category) {
  _boundaryViolations.push({
    violation_id: uuidv4(),
    action,
    category,
    context: _safeClone(context),
    detected_at: new Date().toISOString()
  });
  if (_boundaryViolations.length > MAX_RECORDS) {
    _boundaryViolations.splice(0, _boundaryViolations.length - MAX_RECORDS);
  }
}

function getRecentSuggestions(limit = 30) {
  return _suggestions.slice(-Math.min(limit, 200));
}

function getBoundaryViolations(limit = 30) {
  return _boundaryViolations.slice(-Math.min(limit, 200));
}

function getSaturationState() {
  return {
    arbitrations_this_minute: _rateLimiters.arbitrations.count,
    policy_evaluations_this_minute: _rateLimiters.policy_evaluations.count,
    limits: SATURATION_LIMITS,
    throttles_total: _saturationThrottles,
    cascades_interrupted: _cascadesInterrupted
  };
}

function getMetrics() {
  return {
    suggestions_generated: _suggestionsGenerated,
    boundary_checks: _boundaryChecks,
    boundary_blocks: _boundaryBlocks,
    saturation_throttles: _saturationThrottles,
    cascades_interrupted: _cascadesInterrupted,
    bounded_governance_enabled: BOUNDED_GOV_ENABLED
  };
}

function getHealth() {
  const m = getMetrics();
  return {
    status: !BOUNDED_GOV_ENABLED ? 'disabled'
      : m.saturation_throttles > 100 ? 'saturated'
      : 'healthy',
    metrics: m,
    saturation: getSaturationState()
  };
}

function _safeClone(obj) {
  try { return JSON.parse(JSON.stringify(obj)); }
  catch { return {}; }
}

module.exports = {
  GOVERNANCE_CAPABILITIES,
  FORBIDDEN_ACTIONS,
  SATURATION_LIMITS,
  BOUNDED_GOV_ENABLED,
  checkBoundary,
  suggest,
  simulate,
  getRecentSuggestions,
  getBoundaryViolations,
  getSaturationState,
  getMetrics,
  getHealth
};
