'use strict';

const phaseY = require('./config/phaseYFeatureFlags');
const { logPhaseY } = require('./phaseYLogger');

function calibrateOperationalUsefulness(ctx = {}) {
  const scores = {
    operational_usefulness: ctx.operational_density?.runtime_density_score ?? ctx.runtime_enrichment?.consolidated_signals?.density?.runtime_density_score ?? 0.75,
    decision_usefulness: ctx.decision_reliability?.runtime_decision_confidence ?? 0.78,
    guidance_usefulness: ctx.chat_operational_guidance?.guidance_usefulness ?? 0.72,
    enrichment_usefulness: ctx.runtime_enrichment?.consolidated_signals?.enrichment_integrity ?? ctx.enrichment_integrity?.enrichment_integrity_score ?? 0.8,
    dashboard_usefulness: ctx.semantic_enrichment?.dashboard?.dashboard_usefulness ?? 0.76
  };

  const aggregate = Number(
    (Object.values(scores).reduce((a, b) => a + b, 0) / Object.keys(scores).length).toFixed(4)
  );

  if (aggregate < 0.6 && phaseY.isRuntimeCalibrationObservabilityEnabled()) {
    logPhaseY('LOW_OPERATIONAL_USEFULNESS_DETECTED', { score: aggregate, tenant_id: ctx.tenant_id, shadow_only: true });
  }

  return { ...scores, aggregate_operational_usefulness: aggregate };
}

module.exports = { calibrateOperationalUsefulness };
