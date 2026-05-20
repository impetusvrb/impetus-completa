'use strict';

const { calibrateOperationalUsefulness } = require('./operationalUsefulnessCalibration');
const { consolidateRuntimeGaps } = require('./runtimeGapConsolidator');
const { computeOperationalMaturity } = require('./runtimeOperationalMaturityEngine');
const { superviseTenantStabilization } = require('./tenantStabilizationSupervisor');
const { adviseRuntimeTuning } = require('./controlledRuntimeTuningAdvisor');
const { recordCalibrationSample } = require('./runtimeCalibrationTelemetry');

function calibrateTenantRuntime(tenantId, user, ctx = {}) {
  const usefulness = calibrateOperationalUsefulness(ctx);
  const maturityCtx = { ...ctx, operational_usefulness: usefulness };
  const maturity = computeOperationalMaturity(maturityCtx);
  const stabilization = superviseTenantStabilization(tenantId, { ...ctx, maturity, operational_usefulness: usefulness });
  const gaps = stabilization.gaps;
  const tuning = adviseRuntimeTuning(tenantId, stabilization, maturity, gaps, ctx);

  const calibration_score = Number(
    ((maturity.composite_maturity + stabilization.instability_score) / 2).toFixed(4)
  );

  recordCalibrationSample({
    operational_maturity: maturity.composite_maturity,
    rollout_stability: maturity.rollout_maturity,
    tenant_stability: stabilization.instability_score,
    operational_usefulness: usefulness.aggregate_operational_usefulness
  });

  return {
    tenant_id: tenantId,
    calibration_score,
    critical_tenant: !stabilization.stable || maturity.composite_maturity < 0.55,
    usefulness,
    maturity,
    stabilization,
    gaps,
    tuning,
    contextual_stability: stabilization.instability_score,
    auto_apply: false
  };
}

module.exports = { calibrateTenantRuntime };
