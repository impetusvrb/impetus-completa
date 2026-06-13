'use strict';

/**
 * AIOI-P4.1 — Autonomy Read Model Service (READ ONLY)
 *
 * Agregador P4.0 + capacidades P4.1 — getSovereigntyReadModel uma única vez.
 */

const { isValidUUID } = require('../../utils/security');
const autonomyMetrics = require('./aioiAutonomyMetrics');
const sovereigntyReadModel = require('./aioiSovereigntyReadModelService');
const knowledgeAutonomyService = require('./aioiKnowledgeAutonomyService');
const continuityService = require('./aioiSovereigntyContinuityService');
const coverageService = require('./aioiAutonomyCoverageService');
const enterpriseAutonomyService = require('./aioiEnterpriseAutonomyService');

async function getAutonomyReadModel(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  autonomyMetrics.recordAutonomyRequested(companyId);
  const startMs = Date.now();

  try {
    const srmRes = await sovereigntyReadModel.getSovereigntyReadModel(companyId);
    if (!srmRes.ok) {
      autonomyMetrics.recordError(companyId, 'getAutonomyReadModel', srmRes.error);
      return { ok: false, error: srmRes.error };
    }

    const srm = srmRes.sovereignty_read_model;
    const signals = autonomyMetrics._extractAutonomySignals(srm);

    const knowledge_autonomy = knowledgeAutonomyService.buildKnowledgeAutonomy(srm);
    const sovereignty_continuity = continuityService.buildSovereigntyContinuity(srm);
    const autonomy_coverage = coverageService.buildAutonomyCoverage(srm);

    const enterprise_autonomy = enterpriseAutonomyService.buildEnterpriseAutonomy({
      knowledgeAutonomyScore: knowledge_autonomy.autonomy_score,
      continuityScore:        sovereignty_continuity.continuity_score,
      coverageScore:          autonomy_coverage.coverage_score,
      sovereigntyScore:       signals.sovereigntyScore
    });

    const [
      autonomyRes,
      continuityRes,
      coverageRes,
      enterpriseRes
    ] = await Promise.all([
      Promise.resolve({ ok: true, knowledge_autonomy }),
      Promise.resolve({ ok: true, sovereignty_continuity }),
      Promise.resolve({ ok: true, autonomy_coverage }),
      Promise.resolve({ ok: true, enterprise_autonomy })
    ]);

    autonomyMetrics.recordKnowledgeAutonomyAnalyzed(companyId);
    autonomyMetrics.recordSovereigntyContinuityAnalyzed(companyId);
    autonomyMetrics.recordAutonomyCoverageAnalyzed(companyId);
    autonomyMetrics.recordEnterpriseAutonomyAnalyzed(companyId);
    autonomyMetrics.recordAutonomyCompleted(companyId, Date.now() - startMs);

    return {
      ok: true,
      autonomy_read_model: {
        sovereignty_read_model:   srm,
        knowledge_autonomy:         autonomyRes.knowledge_autonomy,
        sovereignty_continuity:     continuityRes.sovereignty_continuity,
        autonomy_coverage:          coverageRes.autonomy_coverage,
        enterprise_autonomy:        enterpriseRes.enterprise_autonomy
      }
    };

  } catch (err) {
    autonomyMetrics.recordError(companyId, 'getAutonomyReadModel', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  getAutonomyReadModel
};
