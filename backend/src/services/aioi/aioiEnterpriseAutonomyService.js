'use strict';

/**
 * AIOI-P4.1 — Enterprise Autonomy Service (READ ONLY)
 *
 * Score composto: knowledge autonomy + sovereignty continuity + coverage + enterprise sovereignty.
 */

const { isValidUUID } = require('../../utils/security');
const autonomyMetrics = require('./aioiAutonomyMetrics');
const knowledgeAutonomyService = require('./aioiKnowledgeAutonomyService');
const continuityService = require('./aioiSovereigntyContinuityService');
const coverageService = require('./aioiAutonomyCoverageService');
const sovereigntyReadModel = require('./aioiSovereigntyReadModelService');

const ENTERPRISE_AUTONOMY_WEIGHTS = Object.freeze({
  knowledgeAutonomy:      0.25,
  sovereigntyContinuity:    0.25,
  autonomyCoverage:         0.25,
  enterpriseSovereignty:    0.25
});

function computeEnterpriseAutonomyScore({
  knowledgeAutonomyScore, continuityScore, coverageScore, sovereigntyScore
}) {
  const raw =
    (knowledgeAutonomyScore ?? 50) * ENTERPRISE_AUTONOMY_WEIGHTS.knowledgeAutonomy +
    (continuityScore ?? 50) * ENTERPRISE_AUTONOMY_WEIGHTS.sovereigntyContinuity +
    (coverageScore ?? 50) * ENTERPRISE_AUTONOMY_WEIGHTS.autonomyCoverage +
    (sovereigntyScore ?? 50) * ENTERPRISE_AUTONOMY_WEIGHTS.enterpriseSovereignty;
  return autonomyMetrics.clampScore(raw);
}

function buildEnterpriseAutonomy(signals) {
  const autonomy_score = computeEnterpriseAutonomyScore(signals);
  return {
    autonomy_score,
    autonomy_level: autonomyMetrics.classifyEnterpriseAutonomy(autonomy_score)
  };
}

async function getEnterpriseAutonomy(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  try {
    const srmRes = await sovereigntyReadModel.getSovereigntyReadModel(companyId);
    if (!srmRes.ok) {
      autonomyMetrics.recordError(companyId, 'getEnterpriseAutonomy', srmRes.error);
      return { ok: false, error: srmRes.error };
    }

    const srm = srmRes.sovereignty_read_model;
    const extracted = autonomyMetrics._extractAutonomySignals(srm);

    const enterprise_autonomy = buildEnterpriseAutonomy({
      knowledgeAutonomyScore: knowledgeAutonomyService.computeKnowledgeAutonomyScore(srm),
      continuityScore:        continuityService.computeSovereigntyContinuityScore(srm),
      coverageScore:          coverageService.computeAutonomyCoverageScore(srm),
      sovereigntyScore:       extracted.sovereigntyScore
    });

    autonomyMetrics.recordEnterpriseAutonomyAnalyzed(companyId);
    return { ok: true, enterprise_autonomy };

  } catch (err) {
    autonomyMetrics.recordError(companyId, 'getEnterpriseAutonomy', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  ENTERPRISE_AUTONOMY_WEIGHTS,
  computeEnterpriseAutonomyScore,
  buildEnterpriseAutonomy,
  getEnterpriseAutonomy
};
