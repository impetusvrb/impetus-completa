'use strict';

/**
 * AIOI-P4.0 — Enterprise Sovereignty Service (READ ONLY)
 *
 * Score composto: knowledge independence + institutional resilience + coverage + institutionalization.
 */

const { isValidUUID } = require('../../utils/security');
const sovMetrics = require('./aioiSovereigntyMetrics');
const independenceService = require('./aioiKnowledgeIndependenceService');
const resilienceService = require('./aioiInstitutionalResilienceService');
const coverageService = require('./aioiSovereigntyCoverageService');
const institutionalizationReadModel = require('./aioiInstitutionalizationReadModelService');

const ENTERPRISE_SOVEREIGNTY_WEIGHTS = Object.freeze({
  knowledgeIndependence:          0.25,
  institutionalResilience:          0.25,
  sovereigntyCoverage:              0.25,
  enterpriseInstitutionalization:   0.25
});

function computeEnterpriseSovereigntyScore({
  independenceScore, resilienceScore, coverageScore, institutionalizationScore
}) {
  const raw =
    (independenceScore ?? 50) * ENTERPRISE_SOVEREIGNTY_WEIGHTS.knowledgeIndependence +
    (resilienceScore ?? 50) * ENTERPRISE_SOVEREIGNTY_WEIGHTS.institutionalResilience +
    (coverageScore ?? 50) * ENTERPRISE_SOVEREIGNTY_WEIGHTS.sovereigntyCoverage +
    (institutionalizationScore ?? 50) * ENTERPRISE_SOVEREIGNTY_WEIGHTS.enterpriseInstitutionalization;
  return sovMetrics.clampScore(raw);
}

function buildEnterpriseSovereignty(signals) {
  const sovereignty_score = computeEnterpriseSovereigntyScore(signals);
  return {
    sovereignty_score,
    sovereignty_level: sovMetrics.classifyEnterpriseSovereignty(sovereignty_score)
  };
}

async function getEnterpriseSovereignty(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  try {
    const irmRes = await institutionalizationReadModel.getInstitutionalizationReadModel(companyId);
    if (!irmRes.ok) {
      sovMetrics.recordError(companyId, 'getEnterpriseSovereignty', irmRes.error);
      return { ok: false, error: irmRes.error };
    }

    const irm = irmRes.institutionalization_read_model;
    const signals = sovMetrics._extractSovereigntySignals(irm);

    const enterprise_sovereignty = buildEnterpriseSovereignty({
      independenceScore:       independenceService.computeKnowledgeIndependenceScore(irm),
      resilienceScore:         resilienceService.computeInstitutionalResilienceScore(irm),
      coverageScore:           coverageService.computeSovereigntyCoverageScore(irm),
      institutionalizationScore: signals.institutionalizationScore
    });

    sovMetrics.recordEnterpriseSovereigntyAnalyzed(companyId);
    return { ok: true, enterprise_sovereignty };

  } catch (err) {
    sovMetrics.recordError(companyId, 'getEnterpriseSovereignty', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  ENTERPRISE_SOVEREIGNTY_WEIGHTS,
  computeEnterpriseSovereigntyScore,
  buildEnterpriseSovereignty,
  getEnterpriseSovereignty
};
