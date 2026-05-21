'use strict';

const { validateNarrativeCoverage } = require('./narrativeCoverageValidator');
const { protectExecutiveNarrative } = require('./executiveNarrativeBlindnessProtection');
const { protectOperationalNarrative } = require('./operationalNarrativeBlindnessProtection');

function assessSummaryUnderdelivery(summaryPayload = {}, ctx = {}) {
  const tier = String(ctx.hierarchy_tier || 'coordination').toLowerCase();
  const coverage = validateNarrativeCoverage(summaryPayload, ctx);
  const executive = protectExecutiveNarrative(summaryPayload, ctx);
  const operational = protectOperationalNarrative(summaryPayload, ctx);

  let managerial = { protected: true, critical: false };
  if (tier === 'coordination' || tier === 'supervisor') {
    const text = require('../summaryConvergence/summaryTextExtractor').extractSummaryText(summaryPayload).toLowerCase();
    const ok = text.includes('coordenação') || text.includes('gestão') || text.includes('equipas');
    managerial = { protected: ok, critical: text.length > 0 && !ok, fabricated: false };
  }

  const critical =
    coverage.critical_underdelivery ||
    (tier === 'executive' && executive.critical) ||
    (tier === 'operational' && operational.critical) ||
    managerial.critical;

  return {
    phase: 'Z.9',
    coverage,
    executive,
    operational,
    managerial,
    critical_underdelivery: critical,
    recommendation_only: true,
    narrative_fabricated: false,
    auto_remediate: false
  };
}

module.exports = { assessSummaryUnderdelivery };
