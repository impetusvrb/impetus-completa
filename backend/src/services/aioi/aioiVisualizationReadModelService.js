'use strict';

/**
 * AIOI-P4.3 — Visualization Read Model Service (READ ONLY)
 *
 * Agregador P4.2 + capacidades P4.3 — getConsumptionReadModel uma única vez.
 */

const { isValidUUID } = require('../../utils/security');
const visualizationMetrics = require('./aioiVisualizationMetrics');
const consumptionReadModel = require('./aioiConsumptionReadModelService');
const presentationService = require('./aioiExecutivePresentationService');
const consistencyService = require('./aioiVisualizationConsistencyService');
const coverageService = require('./aioiVisualizationCoverageService');
const enterpriseVisualizationService = require('./aioiEnterpriseVisualizationReadinessService');

async function getVisualizationReadModel(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  visualizationMetrics.recordVisualizationRequested(companyId);
  const startMs = Date.now();

  try {
    const crmRes = await consumptionReadModel.getConsumptionReadModel(companyId);
    if (!crmRes.ok) {
      visualizationMetrics.recordError(companyId, 'getVisualizationReadModel', crmRes.error);
      return { ok: false, error: crmRes.error };
    }

    const crm = crmRes.consumption_read_model;

    const executive_presentation = presentationService.buildExecutivePresentation(crm);
    const visualization_consistency = consistencyService.buildVisualizationConsistency(crm);
    const visualization_coverage = coverageService.buildVisualizationCoverage(crm);

    const enterprise_visualization_readiness = enterpriseVisualizationService.buildEnterpriseVisualizationReadiness({
      presentationScore:          executive_presentation.presentation_score,
      consistencyScore:           visualization_consistency.consistency_score,
      coverageScore:              visualization_coverage.coverage_score,
      enterpriseConsumptionScore: crm.enterprise_consumption?.consumption_score
    });

    const [
      presentationRes,
      consistencyRes,
      coverageRes,
      enterpriseRes
    ] = await Promise.all([
      Promise.resolve({ ok: true, executive_presentation }),
      Promise.resolve({ ok: true, visualization_consistency }),
      Promise.resolve({ ok: true, visualization_coverage }),
      Promise.resolve({ ok: true, enterprise_visualization_readiness })
    ]);

    visualizationMetrics.recordExecutivePresentationAnalyzed(companyId);
    visualizationMetrics.recordVisualizationConsistencyAnalyzed(companyId);
    visualizationMetrics.recordVisualizationCoverageAnalyzed(companyId);
    visualizationMetrics.recordEnterpriseVisualizationReadinessAnalyzed(companyId);
    visualizationMetrics.recordVisualizationCompleted(companyId, Date.now() - startMs);

    return {
      ok: true,
      visualization_read_model: {
        consumption_read_model:               crm,
        executive_presentation:                 presentationRes.executive_presentation,
        visualization_consistency:              consistencyRes.visualization_consistency,
        visualization_coverage:                 coverageRes.visualization_coverage,
        enterprise_visualization_readiness:     enterpriseRes.enterprise_visualization_readiness
      }
    };

  } catch (err) {
    visualizationMetrics.recordError(companyId, 'getVisualizationReadModel', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  getVisualizationReadModel
};
