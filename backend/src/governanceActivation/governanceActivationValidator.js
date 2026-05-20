'use strict';

const phaseI = require('./config/phaseIFeatureFlags');
const { logPhaseI } = require('./phaseILogger');
const { getChannelDef } = require('./governanceControlledActivation');

let readinessEngine = null;
let qualityGate = null;

function _readiness() {
  if (!readinessEngine) readinessEngine = require('../governanceReadiness/governanceReadinessEngine');
  return readinessEngine;
}

function _qualityGate() {
  if (!qualityGate) qualityGate = require('../governanceQuality/governancePromotionGate');
  return qualityGate;
}

/**
 * Valida se canal pode ser activado (quality gates Fase H obrigatórios).
 */
function validateActivationRequest(channel, ctx = {}) {
  const def = getChannelDef(channel);
  if (!def) {
    return { valid: false, reason: 'unknown_channel' };
  }

  if (!phaseI.isControlledGovernanceActivationEnabled() && !ctx.force_validation) {
    return {
      valid: false,
      reason: 'controlled_activation_framework_off',
      hint: 'Set IMPETUS_CONTROLLED_GOVERNANCE_ACTIVATION=on to use runtime promotion'
    };
  }

  const readiness = _readiness().assessReadiness({ force: true, ...ctx.readiness_opts });
  const promotion = _qualityGate().evaluatePromotionGate(readiness, { force: true });

  if (readiness.leakage_risk === 'high') {
    return { valid: false, reason: 'leakage_risk_high', readiness };
  }
  if (readiness.drift_stability === 'unstable') {
    return { valid: false, reason: 'drift_unstable', readiness };
  }
  if (!promotion.allowed) {
    logPhaseI('GOVERNANCE_ACTIVATION_DENIED', {
      channel,
      reason: promotion.reason,
      tenant_id: ctx.tenant_id
    });
    return { valid: false, reason: promotion.reason || 'quality_gate_failed', readiness, promotion };
  }

  if ((readiness.readiness_score ?? 0) < (ctx.min_readiness_score ?? 75)) {
    return { valid: false, reason: 'readiness_below_threshold', readiness };
  }

  logPhaseI(def.validate_event || 'GOVERNANCE_ACTIVATION_APPROVED', {
    channel,
    readiness_score: readiness.readiness_score,
    tenant_id: ctx.tenant_id
  });

  return {
    valid: true,
    readiness,
    promotion,
    readiness_score: readiness.readiness_score
  };
}

module.exports = { validateActivationRequest };
