'use strict';

/**
 * AIOI-P5.3 — Enterprise Executive View Model Service (READ ONLY)
 *
 * Composição exclusiva P5.2 — getUiContractBundle uma única vez por request.
 */

const { isValidUUID } = require('../../utils/security');
const uiContractService = require('./aioiUiContractService');
const viewModelMetrics = require('./aioiExecutiveViewModelMetrics');
const executiveSummaryViewModel = require('./aioiExecutiveSummaryViewModel');
const strategicOverviewViewModel = require('./aioiStrategicOverviewViewModel');
const decisionVisualizationViewModel = require('./aioiDecisionVisualizationViewModel');
const interfaceIntelligenceViewModel = require('./aioiInterfaceIntelligenceViewModel');

function createViewModelCache() {
  return {
    contractCache:          uiContractService.createContractCache(),
    uiContractBundle:       null,
    uiContractBundlePromise: null
  };
}

async function loadUiContractBundle(companyId, cache) {
  if (cache.uiContractBundle) return cache.uiContractBundle;
  if (cache.uiContractBundlePromise) return cache.uiContractBundlePromise;

  cache.uiContractBundlePromise = uiContractService.getUiContractBundle(companyId, cache.contractCache);
  cache.uiContractBundle = await cache.uiContractBundlePromise;
  return cache.uiContractBundle;
}

async function getExecutiveViewModelBundle(companyId, cache = createViewModelCache()) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  viewModelMetrics.recordViewModelRequested(companyId, 'bundle');
  const startMs = Date.now();

  try {
    const bundle = await loadUiContractBundle(companyId, cache);
    if (!bundle.ok) {
      viewModelMetrics.recordError(companyId, 'getExecutiveViewModelBundle', bundle.error);
      return { ok: false, error: bundle.error };
    }

    viewModelMetrics.recordExecutiveSummaryViewModel(companyId);
    viewModelMetrics.recordStrategicOverviewViewModel(companyId);
    viewModelMetrics.recordDecisionVisualizationViewModel(companyId);
    viewModelMetrics.recordInterfaceIntelligenceViewModel(companyId);
    viewModelMetrics.recordViewModelCompleted(companyId, 'bundle', Date.now() - startMs);

    return {
      ok: true,
      executive_summary_view_model: executiveSummaryViewModel.buildExecutiveSummaryViewModel(
        bundle.executive_summary_contract
      ),
      strategic_overview_view_model: strategicOverviewViewModel.buildStrategicOverviewViewModel(
        bundle.strategic_overview_contract
      ),
      decision_visualization_view_model: decisionVisualizationViewModel.buildDecisionVisualizationViewModel(
        bundle.decision_visualization_contract
      ),
      interface_intelligence_view_model: interfaceIntelligenceViewModel.buildInterfaceIntelligenceViewModel(
        bundle.interface_intelligence_contract
      )
    };
  } catch (err) {
    viewModelMetrics.recordError(companyId, 'getExecutiveViewModelBundle', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  createViewModelCache,
  loadUiContractBundle,
  getExecutiveSummaryViewModel:      executiveSummaryViewModel.getExecutiveSummaryViewModel,
  getStrategicOverviewViewModel:     strategicOverviewViewModel.getStrategicOverviewViewModel,
  getDecisionVisualizationViewModel: decisionVisualizationViewModel.getDecisionVisualizationViewModel,
  getInterfaceIntelligenceViewModel: interfaceIntelligenceViewModel.getInterfaceIntelligenceViewModel,
  getExecutiveViewModelBundle,
  buildExecutiveSummaryViewModel:      executiveSummaryViewModel.buildExecutiveSummaryViewModel,
  buildStrategicOverviewViewModel:     strategicOverviewViewModel.buildStrategicOverviewViewModel,
  buildDecisionVisualizationViewModel: decisionVisualizationViewModel.buildDecisionVisualizationViewModel,
  buildInterfaceIntelligenceViewModel: interfaceIntelligenceViewModel.buildInterfaceIntelligenceViewModel
};
