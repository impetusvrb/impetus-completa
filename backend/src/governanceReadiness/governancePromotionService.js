'use strict';

const phaseH = require('./config/phaseHFeatureFlags');
const { logPhaseH } = require('./phaseHLogger');
const { assessReadiness } = require('./governanceReadinessEngine');
const { buildActivationPlan } = require('./governanceActivationPlanner');

let promotionGate = null;
function getPromotionGate() {
  if (!promotionGate) {
    try {
      promotionGate = require('../governanceQuality/governancePromotionGate');
    } catch {
      promotionGate = null;
    }
  }
  return promotionGate;
}

/**
 * Avalia promoção de governance — NUNCA activa flags automaticamente.
 */
function evaluatePromotion(opts = {}) {
  const readiness = assessReadiness({ force: opts.force, ...opts });
  const plan = buildActivationPlan({ ...readiness, force: opts.force });
  const gate = getPromotionGate();
  const gateResult = gate ?
    gate.evaluatePromotionGate(readiness, opts) :
    { allowed: false, reason: 'quality_gates_disabled' };

  if (!gateResult.allowed) {
    logPhaseH('GOVERNANCE_PROMOTION_DENIED', { reason: gateResult.reason, readiness_score: readiness.readiness_score });
  }

  return {
    promotion_allowed: gateResult.allowed === true,
    auto_promotion: false,
    readiness,
    activation_plan: plan,
    quality_gate: gateResult,
    manual_steps_required: true
  };
}

module.exports = { evaluatePromotion, phaseH };
