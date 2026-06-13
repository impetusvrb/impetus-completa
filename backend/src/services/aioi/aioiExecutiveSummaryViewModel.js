'use strict';

/**
 * AIOI-P5.3 — Executive Summary View Model (READ ONLY · composição P5.2)
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

function buildExecutiveSummaryViewModel(summaryContract) {
  return {
    view:         'executive_summary',
    title:        'Executive Summary',
    contract:     summaryContract || {},
    generated_at: summaryContract?.generated_at || new Date().toISOString()
  };
}

async function getExecutiveSummaryViewModel(companyId, cache) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  viewModelMetrics.recordViewModelRequested(companyId, 'executive-summary');
  viewModelMetrics.recordExecutiveSummaryViewModel(companyId);
  const startMs = Date.now();

  try {
    await viewModelMetrics.validateTenantRls(companyId);
    const bundle = await _loadUiContractBundle(companyId, cache);
    if (!bundle.ok) {
      viewModelMetrics.recordError(companyId, 'getExecutiveSummaryViewModel', bundle.error);
      return { ok: false, error: bundle.error };
    }

    const viewModel = buildExecutiveSummaryViewModel(bundle.executive_summary_contract);
    viewModelMetrics.recordViewModelCompleted(companyId, 'executive-summary', Date.now() - startMs);
    return { ok: true, ...viewModel };
  } catch (err) {
    viewModelMetrics.recordError(companyId, 'getExecutiveSummaryViewModel', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  buildExecutiveSummaryViewModel,
  getExecutiveSummaryViewModel
};
