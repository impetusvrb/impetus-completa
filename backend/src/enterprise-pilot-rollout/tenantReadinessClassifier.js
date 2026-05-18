'use strict';

const LEVELS = Object.freeze(['LOW', 'MODERATE', 'ADVANCED', 'INDUSTRIAL_READY']);

/**
 * @param {object} ctx — complexity score + shadow pack signals
 */
function classifyTenantReadiness(ctx = {}) {
  const complexity = Number(ctx.complexity_score) || 0;
  const operational = Number(ctx.operational_score) || 0;
  const publicationStable = ctx.publication_stable !== false;
  const frictionOk = ctx.friction_acceptable !== false;
  const cognitiveOk = !ctx.cognitive_overload;

  let level = 'LOW';
  if (operational >= 72 && publicationStable && frictionOk && cognitiveOk) {
    level = 'INDUSTRIAL_READY';
  } else if (operational >= 58 && publicationStable) {
    level = 'ADVANCED';
  } else if (operational >= 42 || complexity >= 35) {
    level = 'MODERATE';
  }

  const reasons = [];
  if (!publicationStable) reasons.push('publication_unstable');
  if (!frictionOk) reasons.push('friction_high');
  if (!cognitiveOk) reasons.push('cognitive_overload');
  if (operational < 42) reasons.push('operational_score_low');

  return {
    level,
    levels: LEVELS,
    operational_score: operational,
    complexity_score: complexity,
    pilot_eligible: ['MODERATE', 'ADVANCED', 'INDUSTRIAL_READY'].includes(level) && reasons.length <= 1,
    reasons
  };
}

module.exports = { LEVELS, classifyTenantReadiness };
