'use strict';

/**
 * AIOI-P3.9 — Enterprise Institutionalization Service (READ ONLY)
 *
 * Score composto: stability + coverage + persistence + governance excellence.
 */

const { isValidUUID } = require('../../utils/security');
const instMetrics = require('./aioiInstitutionalizationMetrics');
const stabilityService = require('./aioiGovernanceStabilityService');
const coverageService = require('./aioiInstitutionalizationCoverageService');
const persistenceService = require('./aioiGovernancePersistenceService');
const governanceExcellenceReadModel = require('./aioiGovernanceExcellenceReadModelService');

const ENTERPRISE_INSTITUTIONALIZATION_WEIGHTS = Object.freeze({
  governanceStability:          0.25,
  institutionalizationCoverage: 0.25,
  governancePersistence:        0.25,
  governanceExcellence:         0.25
});

function computeEnterpriseInstitutionalizationScore({
  stabilityScore, coverageScore, persistenceScore, governanceExcellenceScore
}) {
  const raw =
    (stabilityScore ?? 50) * ENTERPRISE_INSTITUTIONALIZATION_WEIGHTS.governanceStability +
    (coverageScore ?? 50) * ENTERPRISE_INSTITUTIONALIZATION_WEIGHTS.institutionalizationCoverage +
    (persistenceScore ?? 50) * ENTERPRISE_INSTITUTIONALIZATION_WEIGHTS.governancePersistence +
    (governanceExcellenceScore ?? 50) * ENTERPRISE_INSTITUTIONALIZATION_WEIGHTS.governanceExcellence;
  return instMetrics.clampScore(raw);
}

function buildEnterpriseInstitutionalization(signals) {
  const institutionalization_score = computeEnterpriseInstitutionalizationScore(signals);
  return {
    institutionalization_score,
    institutionalization_level: instMetrics.classifyEnterpriseInstitutionalization(institutionalization_score)
  };
}

async function getEnterpriseInstitutionalization(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  try {
    const germRes = await governanceExcellenceReadModel.getGovernanceExcellenceReadModel(companyId);
    if (!germRes.ok) {
      instMetrics.recordError(companyId, 'getEnterpriseInstitutionalization', germRes.error);
      return { ok: false, error: germRes.error };
    }

    const germ = germRes.governance_excellence_read_model;
    const signals = instMetrics._extractInstitutionalizationSignals(germ);

    const enterprise_institutionalization = buildEnterpriseInstitutionalization({
      stabilityScore:           stabilityService.computeGovernanceStabilityScore(germ),
      coverageScore:            coverageService.computeInstitutionalizationCoverageScore(germ),
      persistenceScore:         persistenceService.computeGovernancePersistenceScore(germ),
      governanceExcellenceScore: signals.governanceExcellenceScore
    });

    instMetrics.recordEnterpriseInstitutionalizationAnalyzed(companyId);
    return { ok: true, enterprise_institutionalization };

  } catch (err) {
    instMetrics.recordError(companyId, 'getEnterpriseInstitutionalization', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  ENTERPRISE_INSTITUTIONALIZATION_WEIGHTS,
  computeEnterpriseInstitutionalizationScore,
  buildEnterpriseInstitutionalization,
  getEnterpriseInstitutionalization
};
