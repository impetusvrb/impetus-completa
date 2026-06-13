'use strict';

/**
 * AIOI-P5.2 — Enterprise Executive UI Contract Service (READ ONLY)
 *
 * Composição exclusiva P5.1 — getExecutiveQueryBundle uma única vez por request.
 */

const { isValidUUID } = require('../../utils/security');
const executiveQueryService = require('./aioiExecutiveQueryService');
const uiContractMetrics = require('./aioiUiContractMetrics');

function createContractCache() {
  return {
    queryCache:     executiveQueryService.createQueryCache(),
    bundle:         null,
    bundlePromise:  null
  };
}

async function loadQueryBundle(companyId, cache) {
  if (cache.bundle) return cache.bundle;
  if (cache.bundlePromise) return cache.bundlePromise;

  cache.bundlePromise = executiveQueryService.getExecutiveQueryBundle(companyId, cache.queryCache);
  cache.bundle = await cache.bundlePromise;
  return cache.bundle;
}

async function getUiContractBundle(companyId, cache = createContractCache()) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  const executiveSummaryUiContract = require('./aioiExecutiveSummaryUiContract');
  const strategicOverviewUiContract = require('./aioiStrategicOverviewUiContract');
  const decisionVisualizationUiContract = require('./aioiDecisionVisualizationUiContract');
  const interfaceIntelligenceUiContract = require('./aioiInterfaceIntelligenceUiContract');

  uiContractMetrics.recordUiContractRequested(companyId, 'bundle');
  const startMs = Date.now();

  try {
    const bundle = await loadQueryBundle(companyId, cache);
    if (!bundle.ok) {
      uiContractMetrics.recordError(companyId, 'getUiContractBundle', bundle.error);
      return { ok: false, error: bundle.error };
    }

    uiContractMetrics.recordExecutiveSummaryContract(companyId);
    uiContractMetrics.recordStrategicOverviewContract(companyId);
    uiContractMetrics.recordDecisionVisualizationContract(companyId);
    uiContractMetrics.recordInterfaceIntelligenceContract(companyId);
    uiContractMetrics.recordUiContractCompleted(companyId, 'bundle', Date.now() - startMs);

    return {
      ok: true,
      executive_summary_contract: executiveSummaryUiContract.buildExecutiveSummaryUiContract(
        bundle.executive_summary_query
      ),
      strategic_overview_contract: strategicOverviewUiContract.buildStrategicOverviewUiContract(
        bundle.strategic_overview_query
      ),
      decision_visualization_contract: decisionVisualizationUiContract.buildDecisionVisualizationUiContract(
        bundle.decision_visualization_query
      ),
      interface_intelligence_contract: interfaceIntelligenceUiContract.buildInterfaceIntelligenceUiContract(
        bundle.interface_intelligence_query
      )
    };
  } catch (err) {
    uiContractMetrics.recordError(companyId, 'getUiContractBundle', err.message);
    return { ok: false, error: err.message };
  }
}

const executiveSummaryUiContract = require('./aioiExecutiveSummaryUiContract');
const strategicOverviewUiContract = require('./aioiStrategicOverviewUiContract');
const decisionVisualizationUiContract = require('./aioiDecisionVisualizationUiContract');
const interfaceIntelligenceUiContract = require('./aioiInterfaceIntelligenceUiContract');

module.exports = {
  createContractCache,
  loadQueryBundle,
  getExecutiveSummaryUiContract:      executiveSummaryUiContract.getExecutiveSummaryUiContract,
  getStrategicOverviewUiContract:     strategicOverviewUiContract.getStrategicOverviewUiContract,
  getDecisionVisualizationUiContract: decisionVisualizationUiContract.getDecisionVisualizationUiContract,
  getInterfaceIntelligenceUiContract: interfaceIntelligenceUiContract.getInterfaceIntelligenceUiContract,
  getUiContractBundle,
  buildExecutiveSummaryUiContract:      executiveSummaryUiContract.buildExecutiveSummaryUiContract,
  buildStrategicOverviewUiContract:     strategicOverviewUiContract.buildStrategicOverviewUiContract,
  buildDecisionVisualizationUiContract: decisionVisualizationUiContract.buildDecisionVisualizationUiContract,
  buildInterfaceIntelligenceUiContract: interfaceIntelligenceUiContract.buildInterfaceIntelligenceUiContract
};
