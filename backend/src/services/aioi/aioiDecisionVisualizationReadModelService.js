'use strict';

/**
 * AIOI-P4.5 — Decision Visualization Read Model Service (READ ONLY)
 *
 * Agregador P4.4 + capacidades P4.5 — getExecutiveCockpitReadModel uma única vez.
 */

const { isValidUUID } = require('../../utils/security');
const decisionVisualizationMetrics = require('./aioiDecisionVisualizationMetrics');
const executiveCockpitReadModel = require('./aioiExecutiveCockpitReadModelService');
const perspectiveService = require('./aioiDecisionPerspectiveService');
const consistencyService = require('./aioiDecisionConsistencyService');
const coverageService = require('./aioiDecisionVisualizationCoverageService');
const enterpriseDecisionVisualizationService = require('./aioiEnterpriseDecisionVisualizationService');

async function getDecisionVisualizationReadModel(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  decisionVisualizationMetrics.recordDecisionVisualizationRequested(companyId);
  const startMs = Date.now();

  try {
    const ecrmRes = await executiveCockpitReadModel.getExecutiveCockpitReadModel(companyId);
    if (!ecrmRes.ok) {
      decisionVisualizationMetrics.recordError(companyId, 'getDecisionVisualizationReadModel', ecrmRes.error);
      return { ok: false, error: ecrmRes.error };
    }

    const ecrm = ecrmRes.executive_cockpit_read_model;
    const extracted = decisionVisualizationMetrics._extractDecisionVisualizationSignals(ecrm);

    const decision_perspective = perspectiveService.buildDecisionPerspective(ecrm);
    const decision_consistency = consistencyService.buildDecisionConsistency(ecrm);
    const decision_visualization_coverage = coverageService.buildDecisionVisualizationCoverage(ecrm);

    const enterprise_decision_visualization = enterpriseDecisionVisualizationService.buildEnterpriseDecisionVisualization({
      perspectiveScore:           decision_perspective.perspective_score,
      consistencyScore:           decision_consistency.consistency_score,
      visualizationCoverageScore: decision_visualization_coverage.coverage_score,
      cockpitReadinessScore:      extracted.cockpitReadinessScore
    });

    const [
      perspectiveRes,
      consistencyRes,
      coverageRes,
      enterpriseRes
    ] = await Promise.all([
      Promise.resolve({ ok: true, decision_perspective }),
      Promise.resolve({ ok: true, decision_consistency }),
      Promise.resolve({ ok: true, decision_visualization_coverage }),
      Promise.resolve({ ok: true, enterprise_decision_visualization })
    ]);

    decisionVisualizationMetrics.recordDecisionPerspectiveAnalyzed(companyId);
    decisionVisualizationMetrics.recordDecisionConsistencyAnalyzed(companyId);
    decisionVisualizationMetrics.recordDecisionVisualizationCoverageAnalyzed(companyId);
    decisionVisualizationMetrics.recordEnterpriseDecisionVisualizationAnalyzed(companyId);
    decisionVisualizationMetrics.recordDecisionVisualizationCompleted(companyId, Date.now() - startMs);

    return {
      ok: true,
      decision_visualization_read_model: {
        executive_cockpit_read_model:           ecrm,
        decision_perspective:                       perspectiveRes.decision_perspective,
        decision_consistency:                       consistencyRes.decision_consistency,
        decision_visualization_coverage:            coverageRes.decision_visualization_coverage,
        enterprise_decision_visualization:          enterpriseRes.enterprise_decision_visualization
      }
    };

  } catch (err) {
    decisionVisualizationMetrics.recordError(companyId, 'getDecisionVisualizationReadModel', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  getDecisionVisualizationReadModel
};
