'use strict';

/**
 * AIOI-P3.9 — Institutionalization Read Model Service (READ ONLY)
 *
 * Agregador P3.8 + capacidades P3.9 — getGovernanceExcellenceReadModel uma única vez.
 */

const { isValidUUID } = require('../../utils/security');
const instMetrics = require('./aioiInstitutionalizationMetrics');
const governanceExcellenceReadModel = require('./aioiGovernanceExcellenceReadModelService');
const stabilityService = require('./aioiGovernanceStabilityService');
const coverageService = require('./aioiInstitutionalizationCoverageService');
const persistenceService = require('./aioiGovernancePersistenceService');
const enterpriseInstitutionalizationService = require('./aioiEnterpriseInstitutionalizationService');

async function getInstitutionalizationReadModel(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  instMetrics.recordInstitutionalizationRequested(companyId);
  const startMs = Date.now();

  try {
    const germRes = await governanceExcellenceReadModel.getGovernanceExcellenceReadModel(companyId);
    if (!germRes.ok) {
      instMetrics.recordError(companyId, 'getInstitutionalizationReadModel', germRes.error);
      return { ok: false, error: germRes.error };
    }

    const germ = germRes.governance_excellence_read_model;
    const signals = instMetrics._extractInstitutionalizationSignals(germ);

    const governance_stability = stabilityService.buildGovernanceStability(germ);
    const institutionalization_coverage = coverageService.buildInstitutionalizationCoverage(germ);
    const governance_persistence = persistenceService.buildGovernancePersistence(germ);

    const enterprise_institutionalization = enterpriseInstitutionalizationService.buildEnterpriseInstitutionalization({
      stabilityScore:            governance_stability.stability_score,
      coverageScore:             institutionalization_coverage.coverage_score,
      persistenceScore:          governance_persistence.persistence_score,
      governanceExcellenceScore: signals.governanceExcellenceScore
    });

    const [
      stabilityRes,
      coverageRes,
      persistenceRes,
      enterpriseRes
    ] = await Promise.all([
      Promise.resolve({ ok: true, governance_stability }),
      Promise.resolve({ ok: true, institutionalization_coverage }),
      Promise.resolve({ ok: true, governance_persistence }),
      Promise.resolve({ ok: true, enterprise_institutionalization })
    ]);

    instMetrics.recordGovernanceStabilityAnalyzed(companyId);
    instMetrics.recordInstitutionalizationCoverageAnalyzed(companyId);
    instMetrics.recordGovernancePersistenceAnalyzed(companyId);
    instMetrics.recordEnterpriseInstitutionalizationAnalyzed(companyId);
    instMetrics.recordInstitutionalizationCompleted(companyId, Date.now() - startMs);

    return {
      ok: true,
      institutionalization_read_model: {
        governance_excellence_read_model:   germ,
        governance_stability:               stabilityRes.governance_stability,
        institutionalization_coverage:      coverageRes.institutionalization_coverage,
        governance_persistence:             persistenceRes.governance_persistence,
        enterprise_institutionalization:    enterpriseRes.enterprise_institutionalization
      }
    };

  } catch (err) {
    instMetrics.recordError(companyId, 'getInstitutionalizationReadModel', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  getInstitutionalizationReadModel
};
