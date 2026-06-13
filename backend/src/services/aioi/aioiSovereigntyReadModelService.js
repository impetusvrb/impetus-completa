'use strict';

/**
 * AIOI-P4.0 — Sovereignty Read Model Service (READ ONLY)
 *
 * Agregador P3.9 + capacidades P4.0 — getInstitutionalizationReadModel uma única vez.
 */

const { isValidUUID } = require('../../utils/security');
const sovMetrics = require('./aioiSovereigntyMetrics');
const institutionalizationReadModel = require('./aioiInstitutionalizationReadModelService');
const independenceService = require('./aioiKnowledgeIndependenceService');
const resilienceService = require('./aioiInstitutionalResilienceService');
const coverageService = require('./aioiSovereigntyCoverageService');
const enterpriseSovereigntyService = require('./aioiEnterpriseSovereigntyService');

async function getSovereigntyReadModel(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  sovMetrics.recordSovereigntyRequested(companyId);
  const startMs = Date.now();

  try {
    const irmRes = await institutionalizationReadModel.getInstitutionalizationReadModel(companyId);
    if (!irmRes.ok) {
      sovMetrics.recordError(companyId, 'getSovereigntyReadModel', irmRes.error);
      return { ok: false, error: irmRes.error };
    }

    const irm = irmRes.institutionalization_read_model;
    const signals = sovMetrics._extractSovereigntySignals(irm);

    const knowledge_independence = independenceService.buildKnowledgeIndependence(irm);
    const institutional_resilience = resilienceService.buildInstitutionalResilience(irm);
    const sovereignty_coverage = coverageService.buildSovereigntyCoverage(irm);

    const enterprise_sovereignty = enterpriseSovereigntyService.buildEnterpriseSovereignty({
      independenceScore:         knowledge_independence.independence_score,
      resilienceScore:           institutional_resilience.resilience_score,
      coverageScore:             sovereignty_coverage.coverage_score,
      institutionalizationScore: signals.institutionalizationScore
    });

    const [
      independenceRes,
      resilienceRes,
      coverageRes,
      enterpriseRes
    ] = await Promise.all([
      Promise.resolve({ ok: true, knowledge_independence }),
      Promise.resolve({ ok: true, institutional_resilience }),
      Promise.resolve({ ok: true, sovereignty_coverage }),
      Promise.resolve({ ok: true, enterprise_sovereignty })
    ]);

    sovMetrics.recordKnowledgeIndependenceAnalyzed(companyId);
    sovMetrics.recordInstitutionalResilienceAnalyzed(companyId);
    sovMetrics.recordSovereigntyCoverageAnalyzed(companyId);
    sovMetrics.recordEnterpriseSovereigntyAnalyzed(companyId);
    sovMetrics.recordSovereigntyCompleted(companyId, Date.now() - startMs);

    return {
      ok: true,
      sovereignty_read_model: {
        institutionalization_read_model:  irm,
        knowledge_independence:           independenceRes.knowledge_independence,
        institutional_resilience:         resilienceRes.institutional_resilience,
        sovereignty_coverage:             coverageRes.sovereignty_coverage,
        enterprise_sovereignty:           enterpriseRes.enterprise_sovereignty
      }
    };

  } catch (err) {
    sovMetrics.recordError(companyId, 'getSovereigntyReadModel', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  getSovereigntyReadModel
};
