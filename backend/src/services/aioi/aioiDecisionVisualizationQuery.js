'use strict';

/**
 * AIOI-P5.1 — Decision Visualization Query (READ ONLY · composição P5.0)
 */

const { isValidUUID } = require('../../utils/security');
const executiveQueryMetrics = require('./aioiExecutiveQueryMetrics');
const cockpitApiService = require('./aioiCockpitApiService');

function buildDecisionVisualizationQuery(cockpitDecisionRes, generatedAt) {
  return {
    decision_perspective:              cockpitDecisionRes.decision_perspective || {},
    decision_consistency:              cockpitDecisionRes.decision_consistency || {},
    decision_visualization_coverage:   cockpitDecisionRes.decision_visualization_coverage || {},
    enterprise_decision_visualization: cockpitDecisionRes.enterprise_decision_visualization || {},
    generated_at:                      generatedAt || new Date().toISOString()
  };
}

async function getDecisionVisualizationQuery(companyId, cache) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  executiveQueryMetrics.recordExecutiveQueryRequested(companyId, 'decision-visualization');
  executiveQueryMetrics.recordDecisionVisualizationQuery(companyId);
  const startMs = Date.now();

  try {
    await executiveQueryMetrics.validateTenantRls(companyId);
    const cockpitRes = await cockpitApiService.getCockpitDecisionVisualization(companyId, cache);
    if (!cockpitRes.ok) {
      executiveQueryMetrics.recordError(companyId, 'getDecisionVisualizationQuery', cockpitRes.error);
      return { ok: false, error: cockpitRes.error };
    }

    const generatedAt = new Date().toISOString();
    const query = buildDecisionVisualizationQuery(cockpitRes, generatedAt);
    executiveQueryMetrics.recordExecutiveQueryCompleted(companyId, 'decision-visualization', Date.now() - startMs);
    return { ok: true, ...query };
  } catch (err) {
    executiveQueryMetrics.recordError(companyId, 'getDecisionVisualizationQuery', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  buildDecisionVisualizationQuery,
  getDecisionVisualizationQuery
};
