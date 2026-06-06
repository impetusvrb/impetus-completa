'use strict';

/**
 * AIOI-P3.7 — Enterprise Conformance Service (READ ONLY)
 *
 * Score composto: conformance + standards coverage + continuity + enterprise certification.
 */

const { isValidUUID } = require('../../utils/security');
const confMetrics = require('./aioiConformanceMetrics');
const conformanceService = require('./aioiIntelligenceConformanceService');
const standardsService = require('./aioiStandardsCoverageService');
const continuityService = require('./aioiCertificationContinuityService');
const certificationReadModel = require('./aioiCertificationReadModelService');

const ENTERPRISE_CONFORMANCE_WEIGHTS = Object.freeze({
  intelligenceConformance:  0.25,
  standardsCoverage:        0.25,
  certificationContinuity:  0.25,
  enterpriseCertification:  0.25
});

function computeEnterpriseConformanceScore({
  conformanceScore, coverageScore, continuityScore, enterpriseCertificationScore
}) {
  const raw =
    (conformanceScore ?? 50) * ENTERPRISE_CONFORMANCE_WEIGHTS.intelligenceConformance +
    (coverageScore ?? 50) * ENTERPRISE_CONFORMANCE_WEIGHTS.standardsCoverage +
    (continuityScore ?? 50) * ENTERPRISE_CONFORMANCE_WEIGHTS.certificationContinuity +
    (enterpriseCertificationScore ?? 50) * ENTERPRISE_CONFORMANCE_WEIGHTS.enterpriseCertification;
  return confMetrics.clampScore(raw);
}

function buildEnterpriseConformance(signals) {
  const enterprise_conformance_score = computeEnterpriseConformanceScore(signals);
  return {
    enterprise_conformance_score,
    enterprise_conformance_level: confMetrics.classifyEnterpriseConformanceLevel(
      enterprise_conformance_score
    )
  };
}

async function getEnterpriseConformance(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  try {
    const certRes = await certificationReadModel.getCertificationReadModel(companyId);
    if (!certRes.ok) {
      confMetrics.recordError(companyId, 'getEnterpriseConformance', certRes.error);
      return { ok: false, error: certRes.error };
    }

    const crm = certRes.certification_read_model;
    const signals = confMetrics._extractConformanceSignals(crm);

    const enterprise_conformance = buildEnterpriseConformance({
      conformanceScore:             conformanceService.computeConformanceScore(crm),
      coverageScore:                standardsService.computeStandardsCoverageScore(crm),
      continuityScore:              continuityService.computeCertificationContinuityScore(crm),
      enterpriseCertificationScore: signals.enterpriseCertificationScore
    });

    confMetrics.recordEnterpriseConformanceAnalyzed(companyId);
    return { ok: true, enterprise_conformance };

  } catch (err) {
    confMetrics.recordError(companyId, 'getEnterpriseConformance', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  ENTERPRISE_CONFORMANCE_WEIGHTS,
  computeEnterpriseConformanceScore,
  buildEnterpriseConformance,
  getEnterpriseConformance
};
