'use strict';

/**
 * AIOI-P3.8 — Enterprise Governance Excellence Service (READ ONLY)
 *
 * Score composto: maturity + consistency + coverage + enterprise conformance.
 */

const { isValidUUID } = require('../../utils/security');
const govMetrics = require('./aioiGovernanceExcellenceMetrics');
const maturityService = require('./aioiGovernanceMaturityService');
const consistencyService = require('./aioiExcellenceGovernanceConsistencyService');
const coverageService = require('./aioiGovernanceExcellenceCoverageService');
const conformanceReadModel = require('./aioiConformanceReadModelService');

const ENTERPRISE_GOVERNANCE_EXCELLENCE_WEIGHTS = Object.freeze({
  governanceMaturity:    0.25,
  governanceConsistency:   0.25,
  excellenceCoverage:      0.25,
  enterpriseConformance:   0.25
});

function computeEnterpriseGovernanceExcellenceScore({
  maturityScore, consistencyScore, coverageScore, enterpriseConformanceScore
}) {
  const raw =
    (maturityScore ?? 50) * ENTERPRISE_GOVERNANCE_EXCELLENCE_WEIGHTS.governanceMaturity +
    (consistencyScore ?? 50) * ENTERPRISE_GOVERNANCE_EXCELLENCE_WEIGHTS.governanceConsistency +
    (coverageScore ?? 50) * ENTERPRISE_GOVERNANCE_EXCELLENCE_WEIGHTS.excellenceCoverage +
    (enterpriseConformanceScore ?? 50) * ENTERPRISE_GOVERNANCE_EXCELLENCE_WEIGHTS.enterpriseConformance;
  return govMetrics.clampScore(raw);
}

function buildEnterpriseGovernanceExcellence(signals) {
  const governance_excellence_score = computeEnterpriseGovernanceExcellenceScore(signals);
  return {
    governance_excellence_score,
    governance_excellence_level: govMetrics.classifyGovernanceExcellence(governance_excellence_score)
  };
}

async function getEnterpriseGovernanceExcellence(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  try {
    const confRes = await conformanceReadModel.getConformanceReadModel(companyId);
    if (!confRes.ok) {
      govMetrics.recordError(companyId, 'getEnterpriseGovernanceExcellence', confRes.error);
      return { ok: false, error: confRes.error };
    }

    const confRm = confRes.conformance_read_model;
    const signals = govMetrics._extractGovernanceSignals(confRm);

    const enterprise_governance_excellence = buildEnterpriseGovernanceExcellence({
      maturityScore:              maturityService.computeGovernanceMaturityScore(confRm),
      consistencyScore:           consistencyService.computeGovernanceConsistencyScore(confRm),
      coverageScore:              coverageService.computeGovernanceExcellenceCoverageScore(confRm),
      enterpriseConformanceScore: signals.enterpriseConformanceScore
    });

    govMetrics.recordEnterpriseGovernanceAnalyzed(companyId);
    return { ok: true, enterprise_governance_excellence };

  } catch (err) {
    govMetrics.recordError(companyId, 'getEnterpriseGovernanceExcellence', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  ENTERPRISE_GOVERNANCE_EXCELLENCE_WEIGHTS,
  computeEnterpriseGovernanceExcellenceScore,
  buildEnterpriseGovernanceExcellence,
  getEnterpriseGovernanceExcellence
};
