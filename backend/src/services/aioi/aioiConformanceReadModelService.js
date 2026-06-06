'use strict';

/**
 * AIOI-P3.7 — Conformance Read Model Service (READ ONLY)
 *
 * Agregador P3.6 + capacidades P3.7 — getCertificationReadModel uma única vez.
 */

const { isValidUUID } = require('../../utils/security');
const confMetrics = require('./aioiConformanceMetrics');
const certificationReadModel = require('./aioiCertificationReadModelService');
const conformanceService = require('./aioiIntelligenceConformanceService');
const standardsService = require('./aioiStandardsCoverageService');
const continuityService = require('./aioiCertificationContinuityService');
const enterpriseConformanceService = require('./aioiEnterpriseConformanceService');

async function getConformanceReadModel(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  confMetrics.recordConformanceRequested(companyId);
  const startMs = Date.now();

  try {
    const certRes = await certificationReadModel.getCertificationReadModel(companyId);
    if (!certRes.ok) {
      confMetrics.recordError(companyId, 'getConformanceReadModel', certRes.error);
      return { ok: false, error: certRes.error };
    }

    const crm = certRes.certification_read_model;
    const signals = confMetrics._extractConformanceSignals(crm);

    const intelligence_conformance = conformanceService.buildIntelligenceConformance(crm);
    const standards_coverage = standardsService.buildStandardsCoverage(crm);
    const certification_continuity = continuityService.buildCertificationContinuity(crm);

    const enterprise_conformance = enterpriseConformanceService.buildEnterpriseConformance({
      conformanceScore:             intelligence_conformance.conformance_score,
      coverageScore:                standards_coverage.coverage_score,
      continuityScore:              certification_continuity.continuity_score,
      enterpriseCertificationScore: signals.enterpriseCertificationScore
    });

    const [
      conformanceRes,
      coverageRes,
      continuityRes,
      enterpriseRes
    ] = await Promise.all([
      Promise.resolve({ ok: true, intelligence_conformance }),
      Promise.resolve({ ok: true, standards_coverage }),
      Promise.resolve({ ok: true, certification_continuity }),
      Promise.resolve({ ok: true, enterprise_conformance })
    ]);

    confMetrics.recordConformanceAnalyzed(companyId);
    confMetrics.recordStandardsCoverageAnalyzed(companyId);
    confMetrics.recordCertificationContinuityAnalyzed(companyId);
    confMetrics.recordEnterpriseConformanceAnalyzed(companyId);
    confMetrics.recordConformanceCompleted(companyId, Date.now() - startMs);

    return {
      ok: true,
      conformance_read_model: {
        certification_read_model:      crm,
        intelligence_conformance:      conformanceRes.intelligence_conformance,
        standards_coverage:              coverageRes.standards_coverage,
        certification_continuity:        continuityRes.certification_continuity,
        enterprise_conformance:          enterpriseRes.enterprise_conformance
      }
    };

  } catch (err) {
    confMetrics.recordError(companyId, 'getConformanceReadModel', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  getConformanceReadModel
};
