'use strict';

const flags = require('../productionRuntimeActivation/config/phaseZ12FeatureFlags');
const { assessKpiActivationSafety } = require('./kpiActivationSafety');
const { assessSummaryActivationSafety } = require('./summaryActivationSafety');
const { detectRolloutLeakage } = require('./rolloutLeakageProtection');
const { detectOperationalBlindness } = require('./operationalBlindnessProtection');

function assessActivationSafety(tenantId, user = {}, ctx = {}) {
  const kpi = assessKpiActivationSafety(ctx);
  const summary = assessSummaryActivationSafety(ctx);
  const leakage = detectRolloutLeakage(ctx);
  const blindness = detectOperationalBlindness(ctx);
  const safe = kpi.kpi_safe && summary.summary_safe && !leakage.leakage_detected && !blindness.critical_blind_spot;

  return {
    phase: 'Z.12',
    tenant_id: tenantId,
    enabled: flags.isRuntimeActivationSafetyEnabled(),
    kpi,
    summary,
    leakage,
    blindness,
    activation_safe: safe,
    cross_domain_exposure: leakage.leakage_detected,
    recommendation_only: true,
    auto_remediate: false
  };
}

module.exports = { assessActivationSafety };
