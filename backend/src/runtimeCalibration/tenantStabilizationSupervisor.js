'use strict';

const phaseY = require('./config/phaseYFeatureFlags');
const { logPhaseY } = require('./phaseYLogger');
const { getTenantRuntimeState, recordTenantScore } = require('./tenantRuntimeState');
const { consolidateRuntimeGaps } = require('./runtimeGapConsolidator');

function superviseTenantStabilization(tenantId, ctx = {}) {
  const state = getTenantRuntimeState(tenantId);
  const gaps = consolidateRuntimeGaps({ ...ctx, tenant_id: tenantId });
  const maturity = ctx.maturity?.composite_maturity ?? 0.75;

  recordTenantScore(tenantId, maturity);

  const unstable =
    gaps.critical ||
    maturity < 0.6 ||
    state.oscillation_count >= 2 ||
    gaps.gap_total >= 4;

  if (unstable && phaseY.isRuntimeCalibrationObservabilityEnabled()) {
    logPhaseY('TENANT_RUNTIME_INSTABILITY_DETECTED', { tenant_id: tenantId, maturity, gap_total: gaps.gap_total, shadow_only: true });
  }
  if (state.oscillation_count >= 2) {
    logPhaseY('RUNTIME_OSCILLATION_DETECTED', { tenant_id: tenantId, shadow_only: true });
  }
  if (unstable) {
    logPhaseY('TENANT_STABILIZATION_WARNING', { tenant_id: tenantId, shadow_only: true });
  }

  return {
    tenant_id: tenantId,
    stable: !unstable,
    instability_score: unstable ? Math.max(0.35, 1 - gaps.gap_total * 0.08) : 0.9,
    gaps,
    state,
    operational_pressure: gaps.gap_total >= 3 ? 'high' : gaps.gap_total >= 1 ? 'medium' : 'low',
    runtime_degradation: unstable,
    auto_remediate: false
  };
}

module.exports = { superviseTenantStabilization };
