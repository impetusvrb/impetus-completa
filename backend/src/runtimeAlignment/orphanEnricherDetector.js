'use strict';

const { logPhaseK } = require('../semanticGovernance/phaseKLogger');
const phaseK = require('../semanticGovernance/config/phaseKFeatureFlags');

const ENRICHERS = [
  { id: 'smart_summary', path: 'services/smartSummary', governed: false, legacy: true },
  { id: 'personalized_insights', path: 'services/personalizedInsightsService', governed: false, legacy: true },
  { id: 'executive_composition', path: 'services/enterprise/executiveCompositionService', governed: false, legacy: true },
  { id: 'summary_sanitizer', path: 'policyEngine/channels/summaryExposureSanitizer', governed: true, legacy: false }
];

function detectOrphanEnrichers(ctx = {}) {
  if (!phaseK.isOrphanPipelineDetectionEnabled() && !ctx.force) {
    return { enabled: false, enrichers: [] };
  }

  const legacy = ENRICHERS.filter((e) => e.legacy && !e.governed);
  for (const e of legacy) {
    logPhaseK('LEGACY_ENRICHER_DETECTED', { enricher: e.id, path: e.path });
  }

  return { enabled: true, enrichers: ENRICHERS, legacy_enrichers: legacy };
}

module.exports = { detectOrphanEnrichers, ENRICHERS };
