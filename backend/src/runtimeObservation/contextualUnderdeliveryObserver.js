'use strict';

const flags = require('../phaseZ0/config/phaseZ0FeatureFlags');
const { logPhaseZ0 } = require('../phaseZ0/phaseZ0Logger');

function observeContextualUnderdelivery(ctx = {}) {
  const gaps = [];
  const expected = ctx.canonical_identity?.expected_modules || ctx.expected_modules || [];
  const delivered = ctx.visible_modules || [];

  for (const mod of expected) {
    if (!delivered.includes(mod)) {
      gaps.push({ module: mod, type: 'missing_expected_module' });
    }
  }

  if (ctx.operational_density?.runtime_density_score < 0.5) {
    gaps.push({ type: 'low_operational_density' });
  }
  if (ctx.runtime_enrichment?.low_density) {
    gaps.push({ type: 'enrichment_underdelivery' });
  }

  if (gaps.length && flags.isRuntimeObservationObservabilityEnabled()) {
    logPhaseZ0('CONTEXTUAL_UNDERDELIVERY_DETECTED', { count: gaps.length, tenant_id: ctx.tenant_id, shadow_only: true });
  }

  return { underdelivery_detected: gaps.length > 0, gaps, auto_apply: false };
}

module.exports = { observeContextualUnderdelivery };
