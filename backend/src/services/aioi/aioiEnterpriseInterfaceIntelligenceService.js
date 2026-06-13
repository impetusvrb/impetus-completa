'use strict';

/**
 * AIOI-P4.6 — Enterprise Interface Intelligence Service (READ ONLY)
 *
 * Score composto: perspective + consistency + coverage + enterprise decision visualization.
 */

const { isValidUUID } = require('../../utils/security');
const interfaceIntelligenceMetrics = require('./aioiInterfaceIntelligenceMetrics');
const perspectiveService = require('./aioiInterfacePerspectiveService');
const consistencyService = require('./aioiInterfaceConsistencyService');
const coverageService = require('./aioiInterfaceCoverageService');
const decisionVisualizationReadModel = require('./aioiDecisionVisualizationReadModelService');

const ENTERPRISE_INTERFACE_INTELLIGENCE_WEIGHTS = Object.freeze({
  interfacePerspective:              0.25,
  interfaceConsistency:              0.25,
  interfaceCoverage:                 0.25,
  enterpriseDecisionVisualization:   0.25
});

function computeEnterpriseInterfaceIntelligenceScore({
  perspectiveScore, consistencyScore, coverageScore, enterpriseDecisionVisualizationScore
}) {
  const raw =
    (perspectiveScore ?? 50) * ENTERPRISE_INTERFACE_INTELLIGENCE_WEIGHTS.interfacePerspective +
    (consistencyScore ?? 50) * ENTERPRISE_INTERFACE_INTELLIGENCE_WEIGHTS.interfaceConsistency +
    (coverageScore ?? 50) * ENTERPRISE_INTERFACE_INTELLIGENCE_WEIGHTS.interfaceCoverage +
    (enterpriseDecisionVisualizationScore ?? 50) * ENTERPRISE_INTERFACE_INTELLIGENCE_WEIGHTS.enterpriseDecisionVisualization;
  return interfaceIntelligenceMetrics.clampScore(raw);
}

function buildEnterpriseInterfaceIntelligence(signals) {
  const interface_score = computeEnterpriseInterfaceIntelligenceScore(signals);
  return {
    interface_score,
    interface_level: interfaceIntelligenceMetrics.classifyEnterpriseInterfaceIntelligence(interface_score)
  };
}

async function getEnterpriseInterfaceIntelligence(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  try {
    const dvrmRes = await decisionVisualizationReadModel.getDecisionVisualizationReadModel(companyId);
    if (!dvrmRes.ok) {
      interfaceIntelligenceMetrics.recordError(companyId, 'getEnterpriseInterfaceIntelligence', dvrmRes.error);
      return { ok: false, error: dvrmRes.error };
    }

    const dvrm = dvrmRes.decision_visualization_read_model;
    const extracted = interfaceIntelligenceMetrics._extractInterfaceIntelligenceSignals(dvrm);

    const enterprise_interface_intelligence = buildEnterpriseInterfaceIntelligence({
      perspectiveScore:                    perspectiveService.computeInterfacePerspectiveScore(dvrm),
      consistencyScore:                    consistencyService.computeInterfaceConsistencyScore(dvrm),
      coverageScore:                       coverageService.computeInterfaceCoverageScore(dvrm),
      enterpriseDecisionVisualizationScore: extracted.enterpriseDecisionVisualizationScore
    });

    interfaceIntelligenceMetrics.recordEnterpriseInterfaceIntelligenceAnalyzed(companyId);
    return { ok: true, enterprise_interface_intelligence };

  } catch (err) {
    interfaceIntelligenceMetrics.recordError(companyId, 'getEnterpriseInterfaceIntelligence', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  ENTERPRISE_INTERFACE_INTELLIGENCE_WEIGHTS,
  computeEnterpriseInterfaceIntelligenceScore,
  buildEnterpriseInterfaceIntelligence,
  getEnterpriseInterfaceIntelligence
};
