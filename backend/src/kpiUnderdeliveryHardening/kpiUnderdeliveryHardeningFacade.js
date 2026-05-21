'use strict';

const flags = require('../kpiRuntimeStability/config/phaseZ6FeatureFlags');
const { logPhaseZ6 } = require('../kpiRuntimeStability/phaseZ6Logger');
const { detectCriticalKpiUnderdelivery } = require('./criticalKpiUnderdeliveryDetector');
const { detectOperationalBlindness } = require('./operationalBlindnessDetector');
const { detectExecutiveBlindness } = require('./executiveBlindnessDetector');
const { assessContextualVisibilityDeficit } = require('./contextualVisibilityDeficit');

function getKpiUnderdeliveryHardeningStatus(ctx = {}) {
  return {
    phase: 'Z.6',
    layer: 'kpi-underdelivery-hardening',
    hardening: flags.isKpiUnderdeliveryHardeningEnabled(),
    tenant_id: ctx.tenant_id
  };
}

function hardenKpiUnderdelivery(kpis = [], ctx = {}) {
  const critical = detectCriticalKpiUnderdelivery(kpis, ctx);
  const operational = detectOperationalBlindness(kpis, ctx);
  const executive = detectExecutiveBlindness(kpis, ctx);
  const deficit = assessContextualVisibilityDeficit(kpis, ctx);
  const blindness =
    operational.operational_blindness_critical ||
    executive.executive_blindness_critical ||
    critical.dangerously_empty;

  if (blindness && flags.isKpiRuntimeStabilityObservabilityEnabled()) {
    logPhaseZ6('KPI_BLINDNESS_DETECTED', {
      tenant_id: ctx.tenant_id,
      shadow_only: !flags.isKpiUnderdeliveryHardeningEnabled()
    });
  }

  return {
    status: getKpiUnderdeliveryHardeningStatus(ctx),
    critical,
    operational,
    executive,
    deficit,
    blindness_detected: blindness,
    critical_blocked: critical.critical || blindness,
    auto_remediate: false
  };
}

module.exports = { getKpiUnderdeliveryHardeningStatus, hardenKpiUnderdelivery };
