'use strict';

/**
 * AIOI-P5.3 — Strategic Overview View Model (READ ONLY · composição P5.2)
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

function buildStrategicOverviewViewModel(overviewContract) {
  return {
    view:         'strategic_overview',
    title:        'Strategic Overview',
    contract:     overviewContract || {},
    generated_at: overviewContract?.generated_at || new Date().toISOString()
  };
}

async function getStrategicOverviewViewModel(companyId, cache) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  viewModelMetrics.recordViewModelRequested(companyId, 'strategic-overview');
  viewModelMetrics.recordStrategicOverviewViewModel(companyId);
  const startMs = Date.now();

  try {
    await viewModelMetrics.validateTenantRls(companyId);
    const bundle = await _loadUiContractBundle(companyId, cache);
    if (!bundle.ok) {
      viewModelMetrics.recordError(companyId, 'getStrategicOverviewViewModel', bundle.error);
      return { ok: false, error: bundle.error };
    }

    const viewModel = buildStrategicOverviewViewModel(bundle.strategic_overview_contract);
    viewModelMetrics.recordViewModelCompleted(companyId, 'strategic-overview', Date.now() - startMs);
    return { ok: true, ...viewModel };
  } catch (err) {
    viewModelMetrics.recordError(companyId, 'getStrategicOverviewViewModel', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  buildStrategicOverviewViewModel,
  getStrategicOverviewViewModel
};
