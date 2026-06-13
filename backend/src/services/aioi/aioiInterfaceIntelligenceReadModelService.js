'use strict';

/**
 * AIOI-P4.6 — Interface Intelligence Read Model Service (READ ONLY)
 *
 * Agregador P4.5 + capacidades P4.6 — getDecisionVisualizationReadModel uma única vez.
 */

const { isValidUUID } = require('../../utils/security');
const interfaceIntelligenceMetrics = require('./aioiInterfaceIntelligenceMetrics');
const decisionVisualizationReadModel = require('./aioiDecisionVisualizationReadModelService');
const perspectiveService = require('./aioiInterfacePerspectiveService');
const consistencyService = require('./aioiInterfaceConsistencyService');
const coverageService = require('./aioiInterfaceCoverageService');
const enterpriseInterfaceIntelligenceService = require('./aioiEnterpriseInterfaceIntelligenceService');

async function getInterfaceIntelligenceReadModel(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  interfaceIntelligenceMetrics.recordInterfaceIntelligenceRequested(companyId);
  const startMs = Date.now();

  try {
    const dvrmRes = await decisionVisualizationReadModel.getDecisionVisualizationReadModel(companyId);
    if (!dvrmRes.ok) {
      interfaceIntelligenceMetrics.recordError(companyId, 'getInterfaceIntelligenceReadModel', dvrmRes.error);
      return { ok: false, error: dvrmRes.error };
    }

    const dvrm = dvrmRes.decision_visualization_read_model;
    const extracted = interfaceIntelligenceMetrics._extractInterfaceIntelligenceSignals(dvrm);

    const interface_perspective = perspectiveService.buildInterfacePerspective(dvrm);
    const interface_consistency = consistencyService.buildInterfaceConsistency(dvrm);
    const interface_coverage = coverageService.buildInterfaceCoverage(dvrm);

    const enterprise_interface_intelligence = enterpriseInterfaceIntelligenceService.buildEnterpriseInterfaceIntelligence({
      perspectiveScore:                    interface_perspective.perspective_score,
      consistencyScore:                    interface_consistency.consistency_score,
      coverageScore:                       interface_coverage.coverage_score,
      enterpriseDecisionVisualizationScore: extracted.enterpriseDecisionVisualizationScore
    });

    const [
      perspectiveRes,
      consistencyRes,
      coverageRes,
      enterpriseRes
    ] = await Promise.all([
      Promise.resolve({ ok: true, interface_perspective }),
      Promise.resolve({ ok: true, interface_consistency }),
      Promise.resolve({ ok: true, interface_coverage }),
      Promise.resolve({ ok: true, enterprise_interface_intelligence })
    ]);

    interfaceIntelligenceMetrics.recordInterfacePerspectiveAnalyzed(companyId);
    interfaceIntelligenceMetrics.recordInterfaceConsistencyAnalyzed(companyId);
    interfaceIntelligenceMetrics.recordInterfaceCoverageAnalyzed(companyId);
    interfaceIntelligenceMetrics.recordEnterpriseInterfaceIntelligenceAnalyzed(companyId);
    interfaceIntelligenceMetrics.recordInterfaceIntelligenceCompleted(companyId, Date.now() - startMs);

    return {
      ok: true,
      interface_intelligence_read_model: {
        decision_visualization_read_model:      dvrm,
        interface_perspective:                    perspectiveRes.interface_perspective,
        interface_consistency:                    consistencyRes.interface_consistency,
        interface_coverage:                       coverageRes.interface_coverage,
        enterprise_interface_intelligence:          enterpriseRes.enterprise_interface_intelligence
      }
    };

  } catch (err) {
    interfaceIntelligenceMetrics.recordError(companyId, 'getInterfaceIntelligenceReadModel', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  getInterfaceIntelligenceReadModel
};
