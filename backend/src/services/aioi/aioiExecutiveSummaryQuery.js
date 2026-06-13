'use strict';

/**
 * AIOI-P5.1 — Executive Summary Query (READ ONLY · composição P5.0)
 */

const { isValidUUID } = require('../../utils/security');
const executiveQueryMetrics = require('./aioiExecutiveQueryMetrics');
const cockpitApiService = require('./aioiCockpitApiService');

function buildExecutiveSummaryQuery(cockpitSummaryRes, generatedAt) {
  return {
    executive_summary: cockpitSummaryRes.executive_summary || {},
    cockpit_readiness: cockpitSummaryRes.cockpit_readiness || {},
    generated_at:      generatedAt || new Date().toISOString()
  };
}

async function getExecutiveSummaryQuery(companyId, cache) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  executiveQueryMetrics.recordExecutiveQueryRequested(companyId, 'executive-summary');
  executiveQueryMetrics.recordExecutiveSummaryQuery(companyId);
  const startMs = Date.now();

  try {
    await executiveQueryMetrics.validateTenantRls(companyId);
    const cockpitRes = await cockpitApiService.getCockpitSummary(companyId, cache);
    if (!cockpitRes.ok) {
      executiveQueryMetrics.recordError(companyId, 'getExecutiveSummaryQuery', cockpitRes.error);
      return { ok: false, error: cockpitRes.error };
    }

    const generatedAt = new Date().toISOString();
    const query = buildExecutiveSummaryQuery(cockpitRes, generatedAt);
    executiveQueryMetrics.recordExecutiveQueryCompleted(companyId, 'executive-summary', Date.now() - startMs);
    return { ok: true, ...query };
  } catch (err) {
    executiveQueryMetrics.recordError(companyId, 'getExecutiveSummaryQuery', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  buildExecutiveSummaryQuery,
  getExecutiveSummaryQuery
};
