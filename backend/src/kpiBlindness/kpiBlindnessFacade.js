'use strict';

const flags = require('../kpiConvergence/config/phaseZ7FeatureFlags');
const { logPhaseZ7 } = require('../kpiConvergence/phaseZ7Logger');
const { detectExecutiveBlindSpot } = require('./executiveBlindSpotDetector');
const { detectOperationalBlindSpot } = require('./operationalBlindSpotDetector');
const { detectManagerialBlindSpot } = require('./managerialBlindSpotDetector');
const { analyzeContextualVisibilityGaps } = require('./contextualVisibilityGapAnalyzer');
const { adviseBlindSpotRecovery } = require('./blindSpotRecoveryAdvisor');

function getKpiBlindnessStatus(ctx = {}) {
  return {
    phase: 'Z.7',
    layer: 'kpi-blindness',
    detection: flags.isKpiBlindnessDetectionEnabled(),
    tenant_id: ctx.tenant_id
  };
}

function detectKpiBlindness(kpis = [], ctx = {}) {
  const executive = detectExecutiveBlindSpot(kpis, ctx);
  const operational = detectOperationalBlindSpot(kpis, ctx);
  const managerial = detectManagerialBlindSpot(kpis, ctx);
  const gaps = analyzeContextualVisibilityGaps(kpis, ctx);
  const critical =
    executive.critical || operational.critical || managerial.critical || gaps.severity === 'critical';

  if (critical && flags.isKpiConvergenceObservabilityEnabled()) {
    logPhaseZ7('KPI_BLIND_SPOT_CRITICAL', { tenant_id: ctx.tenant_id, shadow_only: !flags.isKpiBlindnessDetectionEnabled() });
  }

  const blindness = { executive, operational, managerial, gaps };
  return {
    status: getKpiBlindnessStatus(ctx),
    ...blindness,
    critical_blind_spot: critical,
    recovery: adviseBlindSpotRecovery(blindness, ctx),
    recommendation_only: !flags.isKpiBlindnessDetectionEnabled(),
    fabricated: false
  };
}

module.exports = { getKpiBlindnessStatus, detectKpiBlindness };
