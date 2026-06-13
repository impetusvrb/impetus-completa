'use strict';

/**
 * AIOI-P5.2 — Interface Intelligence UI Contract (READ ONLY · composição P5.1)
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

function buildInterfaceIntelligenceUiContract(interfaceQuery) {
  return {
    section:      'interface_intelligence',
    data: {
      interface_perspective:              interfaceQuery.interface_perspective || {},
      interface_consistency:              interfaceQuery.interface_consistency || {},
      interface_coverage:                 interfaceQuery.interface_coverage || {},
      enterprise_interface_intelligence:  interfaceQuery.enterprise_interface_intelligence || {}
    },
    generated_at: interfaceQuery.generated_at || new Date().toISOString()
  };
}

async function getInterfaceIntelligenceUiContract(companyId, cache) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  uiContractMetrics.recordUiContractRequested(companyId, 'interface-intelligence');
  uiContractMetrics.recordInterfaceIntelligenceContract(companyId);
  const startMs = Date.now();

  try {
    await uiContractMetrics.validateTenantRls(companyId);
    const bundle = await _loadQueryBundle(companyId, cache);
    if (!bundle.ok) {
      uiContractMetrics.recordError(companyId, 'getInterfaceIntelligenceUiContract', bundle.error);
      return { ok: false, error: bundle.error };
    }

    const contract = buildInterfaceIntelligenceUiContract(bundle.interface_intelligence_query);
    uiContractMetrics.recordUiContractCompleted(companyId, 'interface-intelligence', Date.now() - startMs);
    return { ok: true, ...contract };
  } catch (err) {
    uiContractMetrics.recordError(companyId, 'getInterfaceIntelligenceUiContract', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  buildInterfaceIntelligenceUiContract,
  getInterfaceIntelligenceUiContract
};
