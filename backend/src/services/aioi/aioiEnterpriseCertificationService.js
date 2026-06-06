'use strict';

/**
 * AIOI-P3.6 — Enterprise Certification Service (READ ONLY)
 *
 * Score composto: readiness + coverage + value governance + sustainability.
 */

const { isValidUUID } = require('../../utils/security');
const certMetrics = require('./aioiCertificationMetrics');
const readinessService = require('./aioiCertificationReadinessService');
const coverageService = require('./aioiAccreditationCoverageService');
const sustainabilityReadModel = require('./aioiSustainabilityReadModelService');

const ENTERPRISE_CERTIFICATION_WEIGHTS = Object.freeze({
  certificationReadiness: 0.25,
  accreditationCoverage:  0.25,
  valueGovernance:        0.25,
  sustainability:         0.25
});

function computeEnterpriseCertificationScore({
  readinessScore, coverageScore, valueGovernanceScore, sustainabilityScore
}) {
  const raw =
    (readinessScore ?? 50) * ENTERPRISE_CERTIFICATION_WEIGHTS.certificationReadiness +
    (coverageScore ?? 50) * ENTERPRISE_CERTIFICATION_WEIGHTS.accreditationCoverage +
    (valueGovernanceScore ?? 50) * ENTERPRISE_CERTIFICATION_WEIGHTS.valueGovernance +
    (sustainabilityScore ?? 50) * ENTERPRISE_CERTIFICATION_WEIGHTS.sustainability;
  return certMetrics.clampScore(raw);
}

function buildEnterpriseCertification(signals) {
  const certification_score = computeEnterpriseCertificationScore(signals);
  return {
    certification_score,
    certification_level: certMetrics.classifyEnterpriseCertificationLevel(certification_score)
  };
}

async function getEnterpriseCertification(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  try {
    const susRes = await sustainabilityReadModel.getSustainabilityReadModel(companyId);
    if (!susRes.ok) {
      certMetrics.recordError(companyId, 'getEnterpriseCertification', susRes.error);
      return { ok: false, error: susRes.error };
    }

    const srm = susRes.sustainability_read_model;
    const signals = certMetrics._extractCertificationSignals(srm);

    const enterprise_certification = buildEnterpriseCertification({
      readinessScore:       readinessService.computeCertificationReadinessScore(srm),
      coverageScore:        coverageService.computeAccreditationCoverageScore(srm),
      valueGovernanceScore: signals.valueGovernanceScore,
      sustainabilityScore:  signals.sustainabilityScore
    });

    certMetrics.recordEnterpriseCertificationAnalyzed(companyId);
    return { ok: true, enterprise_certification };

  } catch (err) {
    certMetrics.recordError(companyId, 'getEnterpriseCertification', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  ENTERPRISE_CERTIFICATION_WEIGHTS,
  computeEnterpriseCertificationScore,
  buildEnterpriseCertification,
  getEnterpriseCertification
};
