'use strict';

const phaseP = require('./config/phasePFeatureFlags');
const { logPhaseP } = require('./phasePLogger');

function detectContextualConflict(ctx = {}) {
  const conflicts = [];
  if (ctx.domain_a && ctx.domain_b && ctx.domain_a !== ctx.domain_b) {
    conflicts.push({ type: 'domain', a: ctx.domain_a, b: ctx.domain_b });
  }
  if (ctx.exposure_ambiguity) {
    conflicts.push({ type: 'exposure_ambiguity' });
  }
  const detected = conflicts.length > 0;
  if (detected && phaseP.isContextualStabilizationObservabilityEnabled()) {
    logPhaseP('CONTEXTUAL_CONFLICT_DETECTED', { conflicts, shadow_only: true });
  }
  return { conflicts, conflict_detected: detected };
}

module.exports = { detectContextualConflict };
