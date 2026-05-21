'use strict';

const flags = require('../phaseZ0/config/phaseZ0FeatureFlags');
const { logPhaseZ0 } = require('../phaseZ0/phaseZ0Logger');

function observeDashboardGenericity(ctx = {}) {
  const signals = [];
  const axis = ctx.canonical_identity?.domain_axis || ctx.functional_axis;

  if (!axis || axis === 'unknown' || axis === 'generic') {
    signals.push({ type: 'undefined_functional_axis' });
  }
  if (ctx.summary_relevance?.summary_usefulness < 0.55) {
    signals.push({ type: 'weak_summary', score: ctx.summary_relevance.summary_usefulness });
  }
  if ((ctx.visible_modules || []).length <= 2 && (ctx.visible_modules || []).every((m) => ['dashboard', 'settings'].includes(m))) {
    signals.push({ type: 'minimal_module_set' });
  }
  if (ctx.precision_delivery?.generic_fallback) {
    signals.push({ type: 'generic_dashboard_fallback' });
  }

  const genericity_score = Number(Math.min(1, signals.length * 0.25).toFixed(4));

  if (genericity_score >= 0.5 && flags.isRuntimeObservationObservabilityEnabled()) {
    logPhaseZ0('DASHBOARD_GENERICITY_DETECTED', { score: genericity_score, tenant_id: ctx.tenant_id, shadow_only: true });
  }

  return {
    generic_dashboard: genericity_score >= 0.5,
    genericity_score,
    signals,
    auto_apply: false
  };
}

module.exports = { observeDashboardGenericity };
