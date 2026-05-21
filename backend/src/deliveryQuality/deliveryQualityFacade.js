'use strict';

const flags = require('../pilotMaturity/config/phaseZ4FeatureFlags');
const { analyzeRuntimeDeliveryQuality } = require('./runtimeDeliveryQualityAnalyzer');
const { validateOperationalUsefulness } = require('./operationalUsefulnessValidator');
const { detectContextualNoise } = require('./contextualNoiseDetector');
const { assessDashboardSignalQuality } = require('./dashboardSignalQuality');

function getDeliveryQualityStatus(ctx = {}) {
  return {
    phase: 'Z.4',
    layer: 'delivery-quality',
    analysis: flags.isDeliveryQualityAnalysisEnabled(),
    recommendation_only: true,
    tenant_id: ctx.tenant_id
  };
}

function analyzeDeliveryQuality(user = {}, ctx = {}) {
  const modules = ctx.visible_modules || [];
  const quality = analyzeRuntimeDeliveryQuality(modules, ctx);
  const usefulness = validateOperationalUsefulness(user, modules, ctx);
  const noise = detectContextualNoise(modules, ctx);
  const dashboardQuality = assessDashboardSignalQuality(ctx.dashboard_payload || {}, ctx);

  return {
    status: getDeliveryQualityStatus(ctx),
    runtime_quality: quality,
    operational_usefulness: usefulness,
    contextual_noise: noise,
    dashboard_signal: dashboardQuality,
    enforcement_applied: false
  };
}

module.exports = { getDeliveryQualityStatus, analyzeDeliveryQuality };
