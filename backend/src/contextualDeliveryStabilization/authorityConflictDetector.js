'use strict';

const { logPhaseP } = require('./phasePLogger');
const phaseP = require('./config/phasePFeatureFlags');

function detectAuthorityConflict(ctx = {}) {
  const overlaps = [];
  if (ctx.authority_a && ctx.authority_b && ctx.authority_a !== ctx.authority_b) {
    overlaps.push({ a: ctx.authority_a, b: ctx.authority_b });
  }
  if (ctx.corporate_view && !ctx.can_view_corporate) {
    overlaps.push({ type: 'corporate_without_authority' });
  }
  const detected = overlaps.length > 0;
  if (detected && phaseP.isContextualStabilizationObservabilityEnabled()) {
    logPhaseP('AUTHORITY_OVERLAP_DETECTED', { overlaps, shadow_only: true });
  }
  return { authority_overlap: detected, overlaps };
}

module.exports = { detectAuthorityConflict };
