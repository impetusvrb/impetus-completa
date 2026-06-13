'use strict';

/**
 * AIOI-P5.2 — Decision Visualization UI Contract (READ ONLY · composição P5.1)
 */

const { isValidUUID } = require('../../utils/security');
const uiContractMetrics = require('./aioiUiContractMetrics');
const executiveQueryService = require('./aioiExecutiveQueryService');

async function _loadQueryBundle(companyId, cache) {
  if (cache.bundle) return cache.bundle;
  if (cache.bundlePromise) return cache.bundlePromise;
  cache.bundlePromise = executiveQueryService.getExecutiveQueryBundle(companyId, cache.queryCache);
  cache.bundle = await cache.bundlePromise;
  return cache.bundle;
}

function buildDecisionVisualizationUiContract(decisionQuery) {
  return {
    section:      'decision_visualization',
    data: {
      decision_perspective:              decisionQuery.decision_perspective || {},
      decision_consistency:              decisionQuery.decision_consistency || {},
      decision_visualization_coverage:   decisionQuery.decision_visualization_coverage || {},
      enterprise_decision_visualization: decisionQuery.enterprise_decision_visualization || {}
    },
    generated_at: decisionQuery.generated_at || new Date().toISOString()
  };
}

async function getDecisionVisualizationUiContract(companyId, cache) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  uiContractMetrics.recordUiContractRequested(companyId, 'decision-visualization');
  uiContractMetrics.recordDecisionVisualizationContract(companyId);
  const startMs = Date.now();

  try {
    await uiContractMetrics.validateTenantRls(companyId);
    const bundle = await _loadQueryBundle(companyId, cache);
    if (!bundle.ok) {
      uiContractMetrics.recordError(companyId, 'getDecisionVisualizationUiContract', bundle.error);
      return { ok: false, error: bundle.error };
    }

    const contract = buildDecisionVisualizationUiContract(bundle.decision_visualization_query);
    uiContractMetrics.recordUiContractCompleted(companyId, 'decision-visualization', Date.now() - startMs);
    return { ok: true, ...contract };
  } catch (err) {
    uiContractMetrics.recordError(companyId, 'getDecisionVisualizationUiContract', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  buildDecisionVisualizationUiContract,
  getDecisionVisualizationUiContract
};
