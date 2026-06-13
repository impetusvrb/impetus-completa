'use strict';

/**
 * AIOI-P5.3 — Decision Visualization View Model (READ ONLY · composição P5.2)
 */

const { isValidUUID } = require('../../utils/security');
const viewModelMetrics = require('./aioiExecutiveViewModelMetrics');
const uiContractService = require('./aioiUiContractService');

async function _loadUiContractBundle(companyId, cache) {
  if (cache.uiContractBundle) return cache.uiContractBundle;
  if (cache.uiContractBundlePromise) return cache.uiContractBundlePromise;
  cache.uiContractBundlePromise = uiContractService.getUiContractBundle(companyId, cache.contractCache);
  cache.uiContractBundle = await cache.uiContractBundlePromise;
  return cache.uiContractBundle;
}

function buildDecisionVisualizationViewModel(decisionContract) {
  return {
    view:         'decision_visualization',
    title:        'Decision Visualization',
    contract:     decisionContract || {},
    generated_at: decisionContract?.generated_at || new Date().toISOString()
  };
}

async function getDecisionVisualizationViewModel(companyId, cache) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  viewModelMetrics.recordViewModelRequested(companyId, 'decision-visualization');
  viewModelMetrics.recordDecisionVisualizationViewModel(companyId);
  const startMs = Date.now();

  try {
    await viewModelMetrics.validateTenantRls(companyId);
    const bundle = await _loadUiContractBundle(companyId, cache);
    if (!bundle.ok) {
      viewModelMetrics.recordError(companyId, 'getDecisionVisualizationViewModel', bundle.error);
      return { ok: false, error: bundle.error };
    }

    const viewModel = buildDecisionVisualizationViewModel(bundle.decision_visualization_contract);
    viewModelMetrics.recordViewModelCompleted(companyId, 'decision-visualization', Date.now() - startMs);
    return { ok: true, ...viewModel };
  } catch (err) {
    viewModelMetrics.recordError(companyId, 'getDecisionVisualizationViewModel', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  buildDecisionVisualizationViewModel,
  getDecisionVisualizationViewModel
};
