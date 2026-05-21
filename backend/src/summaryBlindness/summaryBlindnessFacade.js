'use strict';

const flags = require('../summaryConvergence/config/phaseZ8FeatureFlags');
const { logPhaseZ8 } = require('../summaryConvergence/phaseZ8Logger');
const { detectExecutiveNarrativeBlindness } = require('./executiveNarrativeBlindness');
const { detectOperationalNarrativeBlindness } = require('./operationalNarrativeBlindness');
const { detectNarrativeAmbiguity } = require('./narrativeAmbiguityDetector');
const { detectWeakOperationalGuidance } = require('./weakOperationalGuidanceDetector');
const { analyzeNarrativeGaps } = require('./narrativeGapAnalyzer');

function getSummaryBlindnessStatus(ctx = {}) {
  return {
    phase: 'Z.8',
    layer: 'summary-blindness',
    detection: flags.isSummaryBlindnessDetectionEnabled(),
    tenant_id: ctx.tenant_id
  };
}

function detectSummaryBlindness(summaryPayload = {}, ctx = {}) {
  const executive = detectExecutiveNarrativeBlindness(summaryPayload, ctx);
  const operational = detectOperationalNarrativeBlindness(summaryPayload, ctx);
  const ambiguity = detectNarrativeAmbiguity(summaryPayload);
  const weak_guidance = detectWeakOperationalGuidance(summaryPayload, ctx);
  const gaps = analyzeNarrativeGaps(summaryPayload, ctx);
  const critical =
    executive.critical || operational.critical || weak_guidance.critical || gaps.severity === 'critical';

  if (critical && flags.isSummaryConvergenceObservabilityEnabled()) {
    logPhaseZ8('SUMMARY_BLIND_SPOT_CRITICAL', { tenant_id: ctx.tenant_id, shadow_only: true });
  }

  return {
    status: getSummaryBlindnessStatus(ctx),
    executive,
    operational,
    ambiguity,
    weak_guidance,
    gaps,
    critical_blind_spot: critical,
    recommendation_only: true,
    auto_remediate: false,
    narrative_censored: false
  };
}

module.exports = { getSummaryBlindnessStatus, detectSummaryBlindness };
