'use strict';

/**
 * EVENT-GOVERNANCE-18 — DTO interno para dashboards executivos (não exposto em APIs públicas).
 */

const crypto = require('crypto');

/**
 * @param {object} params
 * @returns {object}
 */
function buildGovernanceExecutiveInsightsDto(params) {
  const kpis = params.kpis || {};
  const indicators = params.indicators || {};
  const trends = Array.isArray(params.trends) ? params.trends : [];
  const risks = Array.isArray(params.risks) ? params.risks : [];
  const recommendations = Array.isArray(params.recommendations) ? params.recommendations : [];
  const evolution = params.evolution || {};

  return Object.freeze({
    reportId: params.reportId || crypto.randomUUID(),
    companyId: params.companyId || null,
    generatedAt: params.generatedAt || new Date().toISOString(),
    executiveSummary: Object.freeze({
      headline: params.headline || null,
      governanceEvolutionTrend: kpis.governanceEvolutionTrend || 'stable',
      keyIndicators: Object.freeze({ ...indicators }),
      trends: Object.freeze(trends.map((t) => Object.freeze({ ...t }))),
      risks: Object.freeze(risks.map((r) => Object.freeze({ ...r }))),
      recommendations: Object.freeze(recommendations.map((r) => Object.freeze({ ...r }))),
      evolution: Object.freeze({ ...evolution })
    }),
    kpis: Object.freeze({
      governanceMaturityIndex: normalizeScore(kpis.governanceMaturityIndex),
      operationalStabilityIndex: normalizeScore(kpis.operationalStabilityIndex),
      policyEfficiencyIndex: normalizeScore(kpis.policyEfficiencyIndex),
      continuousImprovementIndex: normalizeScore(kpis.continuousImprovementIndex),
      governanceEvolutionTrend: kpis.governanceEvolutionTrend || 'stable'
    }),
    indicators: Object.freeze({ ...indicators }),
    trends: Object.freeze(trends.map((t) => Object.freeze({ ...t }))),
    risks: Object.freeze(risks.map((r) => Object.freeze({ ...r }))),
    recommendations: Object.freeze(recommendations.map((r) => Object.freeze({ ...r }))),
    evolution: Object.freeze({ ...evolution })
  });
}

function normalizeScore(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.round(Math.min(1, Math.max(0, n)) * 1000) / 1000;
}

module.exports = {
  buildGovernanceExecutiveInsightsDto
};
