'use strict';

/**
 * AIOI-P5.2 — Strategic Overview UI Contract (READ ONLY · composição P5.1)
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

function buildStrategicOverviewUiContract(overviewQuery) {
  return {
    section:      'strategic_overview',
    data: {
      strategic_overview:      overviewQuery.strategic_overview || {},
      visualization_readiness: overviewQuery.visualization_readiness || {}
    },
    generated_at: overviewQuery.generated_at || new Date().toISOString()
  };
}

async function getStrategicOverviewUiContract(companyId, cache) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  uiContractMetrics.recordUiContractRequested(companyId, 'strategic-overview');
  uiContractMetrics.recordStrategicOverviewContract(companyId);
  const startMs = Date.now();

  try {
    await uiContractMetrics.validateTenantRls(companyId);
    const bundle = await _loadQueryBundle(companyId, cache);
    if (!bundle.ok) {
      uiContractMetrics.recordError(companyId, 'getStrategicOverviewUiContract', bundle.error);
      return { ok: false, error: bundle.error };
    }

    const contract = buildStrategicOverviewUiContract(bundle.strategic_overview_query);
    uiContractMetrics.recordUiContractCompleted(companyId, 'strategic-overview', Date.now() - startMs);
    return { ok: true, ...contract };
  } catch (err) {
    uiContractMetrics.recordError(companyId, 'getStrategicOverviewUiContract', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  buildStrategicOverviewUiContract,
  getStrategicOverviewUiContract
};
