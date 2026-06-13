'use strict';

/**
 * AIOI-P5.1 — Interface Intelligence Query (READ ONLY · composição P5.0)
 */

const { isValidUUID } = require('../../utils/security');
const executiveQueryMetrics = require('./aioiExecutiveQueryMetrics');
const cockpitApiService = require('./aioiCockpitApiService');

function buildInterfaceIntelligenceQuery(cockpitInterfaceRes, generatedAt) {
  return {
    interface_perspective:              cockpitInterfaceRes.interface_perspective || {},
    interface_consistency:              cockpitInterfaceRes.interface_consistency || {},
    interface_coverage:                 cockpitInterfaceRes.interface_coverage || {},
    enterprise_interface_intelligence:    cockpitInterfaceRes.enterprise_interface_intelligence || {},
    generated_at:                       generatedAt || new Date().toISOString()
  };
}

async function getInterfaceIntelligenceQuery(companyId, cache) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  executiveQueryMetrics.recordExecutiveQueryRequested(companyId, 'interface-intelligence');
  executiveQueryMetrics.recordInterfaceIntelligenceQuery(companyId);
  const startMs = Date.now();

  try {
    await executiveQueryMetrics.validateTenantRls(companyId);
    const cockpitRes = await cockpitApiService.getCockpitInterfaceIntelligence(companyId, cache);
    if (!cockpitRes.ok) {
      executiveQueryMetrics.recordError(companyId, 'getInterfaceIntelligenceQuery', cockpitRes.error);
      return { ok: false, error: cockpitRes.error };
    }

    const generatedAt = new Date().toISOString();
    const query = buildInterfaceIntelligenceQuery(cockpitRes, generatedAt);
    executiveQueryMetrics.recordExecutiveQueryCompleted(companyId, 'interface-intelligence', Date.now() - startMs);
    return { ok: true, ...query };
  } catch (err) {
    executiveQueryMetrics.recordError(companyId, 'getInterfaceIntelligenceQuery', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  buildInterfaceIntelligenceQuery,
  getInterfaceIntelligenceQuery
};
