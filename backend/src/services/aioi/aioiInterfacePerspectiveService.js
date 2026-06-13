'use strict';

/**
 * AIOI-P4.6 — Interface Perspective Service (READ ONLY)
 *
 * Consolida perspectiva de interface via composição P4.5 (getDecisionVisualizationReadModel).
 */

const { isValidUUID } = require('../../utils/security');
const interfaceIntelligenceMetrics = require('./aioiInterfaceIntelligenceMetrics');
const decisionVisualizationReadModel = require('./aioiDecisionVisualizationReadModelService');

const PERSPECTIVE_COMPONENTS = Object.freeze([
  'decision_perspective', 'decision_consistency',
  'decision_visualization_coverage', 'enterprise_decision_visualization'
]);

function computeInterfacePerspectiveScore(dvrm) {
  const signals = interfaceIntelligenceMetrics._extractInterfaceIntelligenceSignals(dvrm);
  const values = PERSPECTIVE_COMPONENTS.map(k => {
    switch (k) {
      case 'decision_perspective':             return signals.decisionPerspectiveScore;
      case 'decision_consistency':             return signals.decisionConsistencyScore;
      case 'decision_visualization_coverage':  return signals.decisionVisualizationCoverageScore;
      case 'enterprise_decision_visualization': return signals.enterpriseDecisionVisualizationScore;
      default:                                 return null;
    }
  }).filter(v => v != null);

  if (!values.length) return 30;
  return interfaceIntelligenceMetrics.clampScore(values.reduce((s, v) => s + v, 0) / values.length);
}

function buildInterfacePerspective(dvrm) {
  const perspective_score = computeInterfacePerspectiveScore(dvrm);
  return {
    perspective_score,
    perspective_status: interfaceIntelligenceMetrics.classifyInterfacePerspective(perspective_score)
  };
}

async function getInterfacePerspective(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  try {
    const dvrmRes = await decisionVisualizationReadModel.getDecisionVisualizationReadModel(companyId);
    if (!dvrmRes.ok) {
      interfaceIntelligenceMetrics.recordError(companyId, 'getInterfacePerspective', dvrmRes.error);
      return { ok: false, error: dvrmRes.error };
    }

    const interface_perspective = buildInterfacePerspective(dvrmRes.decision_visualization_read_model);
    interfaceIntelligenceMetrics.recordInterfacePerspectiveAnalyzed(companyId);
    return { ok: true, interface_perspective };

  } catch (err) {
    interfaceIntelligenceMetrics.recordError(companyId, 'getInterfacePerspective', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  PERSPECTIVE_COMPONENTS,
  computeInterfacePerspectiveScore,
  buildInterfacePerspective,
  getInterfacePerspective
};
