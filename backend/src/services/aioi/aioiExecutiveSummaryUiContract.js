'use strict';

/**
 * AIOI-P5.2 — Executive Summary UI Contract (READ ONLY · composição P5.1)
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

function buildExecutiveSummaryUiContract(summaryQuery) {
  return {
    section:      'executive_summary',
    data: {
      executive_summary: summaryQuery.executive_summary || {},
      cockpit_readiness: summaryQuery.cockpit_readiness || {}
    },
    generated_at: summaryQuery.generated_at || new Date().toISOString()
  };
}

async function getExecutiveSummaryUiContract(companyId, cache) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  uiContractMetrics.recordUiContractRequested(companyId, 'executive-summary');
  uiContractMetrics.recordExecutiveSummaryContract(companyId);
  const startMs = Date.now();

  try {
    await uiContractMetrics.validateTenantRls(companyId);
    const bundle = await _loadQueryBundle(companyId, cache);
    if (!bundle.ok) {
      uiContractMetrics.recordError(companyId, 'getExecutiveSummaryUiContract', bundle.error);
      return { ok: false, error: bundle.error };
    }

    const contract = buildExecutiveSummaryUiContract(bundle.executive_summary_query);
    uiContractMetrics.recordUiContractCompleted(companyId, 'executive-summary', Date.now() - startMs);
    return { ok: true, ...contract };
  } catch (err) {
    uiContractMetrics.recordError(companyId, 'getExecutiveSummaryUiContract', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  buildExecutiveSummaryUiContract,
  getExecutiveSummaryUiContract
};
