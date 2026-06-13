'use strict';

/**
 * AIOI-P4.5 — Decision Perspective Service (READ ONLY)
 *
 * Consolida perspectiva executiva via composição P4.4 (getExecutiveCockpitReadModel).
 */

const { isValidUUID } = require('../../utils/security');
const decisionVisualizationMetrics = require('./aioiDecisionVisualizationMetrics');
const executiveCockpitReadModel = require('./aioiExecutiveCockpitReadModelService');

const PERSPECTIVE_COMPONENTS = Object.freeze([
  'executive_summary', 'strategic_overview', 'cockpit_readiness', 'visualization_readiness'
]);

function computeDecisionPerspectiveScore(ecrm) {
  const signals = decisionVisualizationMetrics._extractDecisionVisualizationSignals(ecrm);
  const values = PERSPECTIVE_COMPONENTS.map(k => {
    switch (k) {
      case 'executive_summary':        return signals.executiveSummaryScore;
      case 'strategic_overview':       return signals.strategicOverviewScore;
      case 'cockpit_readiness':        return signals.cockpitReadinessScore;
      case 'visualization_readiness':  return signals.visualizationReadinessScore;
      default:                         return null;
    }
  }).filter(v => v != null);

  if (!values.length) return 30;
  return decisionVisualizationMetrics.clampScore(values.reduce((s, v) => s + v, 0) / values.length);
}

function buildDecisionPerspective(ecrm) {
  const perspective_score = computeDecisionPerspectiveScore(ecrm);
  return {
    perspective_score,
    perspective_status: decisionVisualizationMetrics.classifyDecisionPerspective(perspective_score)
  };
}

async function getDecisionPerspective(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  try {
    const ecrmRes = await executiveCockpitReadModel.getExecutiveCockpitReadModel(companyId);
    if (!ecrmRes.ok) {
      decisionVisualizationMetrics.recordError(companyId, 'getDecisionPerspective', ecrmRes.error);
      return { ok: false, error: ecrmRes.error };
    }

    const decision_perspective = buildDecisionPerspective(ecrmRes.executive_cockpit_read_model);
    decisionVisualizationMetrics.recordDecisionPerspectiveAnalyzed(companyId);
    return { ok: true, decision_perspective };

  } catch (err) {
    decisionVisualizationMetrics.recordError(companyId, 'getDecisionPerspective', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  PERSPECTIVE_COMPONENTS,
  computeDecisionPerspectiveScore,
  buildDecisionPerspective,
  getDecisionPerspective
};
