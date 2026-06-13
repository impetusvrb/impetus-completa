'use strict';

/**
 * AIOI-P5.1 — Strategic Overview Query (READ ONLY · composição P5.0)
 */

const { isValidUUID } = require('../../utils/security');
const executiveQueryMetrics = require('./aioiExecutiveQueryMetrics');
const cockpitApiService = require('./aioiCockpitApiService');

function buildStrategicOverviewQuery(cockpitOverviewRes, generatedAt) {
  return {
    strategic_overview:      cockpitOverviewRes.strategic_overview || {},
    visualization_readiness: cockpitOverviewRes.visualization_readiness || {},
    generated_at:              generatedAt || new Date().toISOString()
  };
}

async function getStrategicOverviewQuery(companyId, cache) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  executiveQueryMetrics.recordExecutiveQueryRequested(companyId, 'strategic-overview');
  executiveQueryMetrics.recordStrategicOverviewQuery(companyId);
  const startMs = Date.now();

  try {
    await executiveQueryMetrics.validateTenantRls(companyId);
    const cockpitRes = await cockpitApiService.getCockpitOverview(companyId, cache);
    if (!cockpitRes.ok) {
      executiveQueryMetrics.recordError(companyId, 'getStrategicOverviewQuery', cockpitRes.error);
      return { ok: false, error: cockpitRes.error };
    }

    const generatedAt = new Date().toISOString();
    const query = buildStrategicOverviewQuery(cockpitRes, generatedAt);
    executiveQueryMetrics.recordExecutiveQueryCompleted(companyId, 'strategic-overview', Date.now() - startMs);
    return { ok: true, ...query };
  } catch (err) {
    executiveQueryMetrics.recordError(companyId, 'getStrategicOverviewQuery', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  buildStrategicOverviewQuery,
  getStrategicOverviewQuery
};
