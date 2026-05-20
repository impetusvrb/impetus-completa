'use strict';

const flags = require('./config/tenantRolloutFeatureFlags');
const { logTenantRollout } = require('./tenantRolloutLogger');
const { recordTenantObserved } = require('./tenantRolloutTelemetry');

function observeTenantRuntime(tenantId, ctx = {}) {
  recordTenantObserved();

  const anomalies = [];
  if (ctx.runtime_calibration?.critical_tenant) anomalies.push({ type: 'critical_tenant' });
  if (ctx.tenant_stabilization?.stable === false) anomalies.push({ type: 'instability' });
  if (ctx.telemetry_integrity?.gaps_detected) {
    anomalies.push({ type: 'stale_enrichment', count: (ctx.telemetry_integrity.gaps || []).length });
  }
  if (ctx.runtime_enrichment?.low_density) anomalies.push({ type: 'enrichment_degradation' });
  if (ctx.controlled_activation?.readiness?.readiness_ok === false) {
    anomalies.push({ type: 'activation_readiness_low' });
  }

  const instability_score =
    anomalies.length === 0 ? 0.92 : Number(Math.max(0.4, 0.92 - anomalies.length * 0.12).toFixed(4));

  if (anomalies.length >= 2 && flags.isTenantRolloutObservabilityEnabled()) {
    logTenantRollout('TENANT_ROLLOUT_INSTABILITY', { tenant_id: tenantId, anomalies: anomalies.length, shadow_only: true });
  }
  if (anomalies.some((a) => a.type === 'stale_enrichment')) {
    logTenantRollout('TENANT_STALE_ENRICHMENT_OBSERVED', { tenant_id: tenantId, shadow_only: true });
  }

  return {
    tenant_id: tenantId,
    anomalies,
    instability_score,
    runtime_degradation: anomalies.length >= 2,
    observation_only: !flags.isTenantRolloutActivationEnabled()
  };
}

module.exports = { observeTenantRuntime };
