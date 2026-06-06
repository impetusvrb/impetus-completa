'use strict';

/**
 * AIOI-P3.6 — Certification Read Model Service (READ ONLY)
 *
 * Agregador P3.5 + capacidades P3.6 — getSustainabilityReadModel uma única vez.
 */

const { isValidUUID } = require('../../utils/security');
const certMetrics = require('./aioiCertificationMetrics');
const sustainabilityReadModel = require('./aioiSustainabilityReadModelService');
const readinessService = require('./aioiCertificationReadinessService');
const coverageService = require('./aioiAccreditationCoverageService');
const maturityService = require('./aioiIntelligenceMaturityCertificationService');
const enterpriseCertificationService = require('./aioiEnterpriseCertificationService');

async function getCertificationReadModel(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  certMetrics.recordCertificationRequested(companyId);
  const startMs = Date.now();

  try {
    const susRes = await sustainabilityReadModel.getSustainabilityReadModel(companyId);
    if (!susRes.ok) {
      certMetrics.recordError(companyId, 'getCertificationReadModel', susRes.error);
      return { ok: false, error: susRes.error };
    }

    const srm = susRes.sustainability_read_model;
    const signals = certMetrics._extractCertificationSignals(srm);

    const certification_readiness = readinessService.buildCertificationReadiness(srm);
    const accreditation_coverage = coverageService.buildAccreditationCoverage(srm);
    const intelligence_maturity_certification = maturityService.buildIntelligenceMaturityCertification(srm);

    const enterprise_certification = enterpriseCertificationService.buildEnterpriseCertification({
      readinessScore:       certification_readiness.certification_readiness_score,
      coverageScore:        accreditation_coverage.coverage_score,
      valueGovernanceScore: signals.valueGovernanceScore,
      sustainabilityScore:  signals.sustainabilityScore
    });

    const [
      readinessRes,
      coverageRes,
      maturityRes,
      enterpriseRes
    ] = await Promise.all([
      Promise.resolve({ ok: true, certification_readiness }),
      Promise.resolve({ ok: true, accreditation_coverage }),
      Promise.resolve({ ok: true, intelligence_maturity_certification }),
      Promise.resolve({ ok: true, enterprise_certification })
    ]);

    certMetrics.recordCertificationReadinessAnalyzed(companyId);
    certMetrics.recordAccreditationCoverageAnalyzed(companyId);
    certMetrics.recordMaturityCertificationAnalyzed(companyId);
    certMetrics.recordEnterpriseCertificationAnalyzed(companyId);
    certMetrics.recordCertificationCompleted(companyId, Date.now() - startMs);

    return {
      ok: true,
      certification_read_model: {
        sustainability_read_model:           srm,
        certification_readiness:               readinessRes.certification_readiness,
        accreditation_coverage:                coverageRes.accreditation_coverage,
        intelligence_maturity_certification: maturityRes.intelligence_maturity_certification,
        enterprise_certification:              enterpriseRes.enterprise_certification
      }
    };

  } catch (err) {
    certMetrics.recordError(companyId, 'getCertificationReadModel', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  getCertificationReadModel
};
