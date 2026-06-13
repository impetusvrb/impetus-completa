'use strict';

/**
 * AIOI-P5.3 — Interface Intelligence View Model (READ ONLY · composição P5.2)
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

function buildInterfaceIntelligenceViewModel(interfaceContract) {
  return {
    view:         'interface_intelligence',
    title:        'Interface Intelligence',
    contract:     interfaceContract || {},
    generated_at: interfaceContract?.generated_at || new Date().toISOString()
  };
}

async function getInterfaceIntelligenceViewModel(companyId, cache) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  viewModelMetrics.recordViewModelRequested(companyId, 'interface-intelligence');
  viewModelMetrics.recordInterfaceIntelligenceViewModel(companyId);
  const startMs = Date.now();

  try {
    await viewModelMetrics.validateTenantRls(companyId);
    const bundle = await _loadUiContractBundle(companyId, cache);
    if (!bundle.ok) {
      viewModelMetrics.recordError(companyId, 'getInterfaceIntelligenceViewModel', bundle.error);
      return { ok: false, error: bundle.error };
    }

    const viewModel = buildInterfaceIntelligenceViewModel(bundle.interface_intelligence_contract);
    viewModelMetrics.recordViewModelCompleted(companyId, 'interface-intelligence', Date.now() - startMs);
    return { ok: true, ...viewModel };
  } catch (err) {
    viewModelMetrics.recordError(companyId, 'getInterfaceIntelligenceViewModel', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  buildInterfaceIntelligenceViewModel,
  getInterfaceIntelligenceViewModel
};
