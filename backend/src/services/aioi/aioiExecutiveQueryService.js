'use strict';

/**
 * AIOI-P5.1 — Enterprise Executive Query Service (READ ONLY)
 *
 * Composição exclusiva P5.0 — cache partilhado por request, sem fan-out de read model.
 */

const { isValidUUID } = require('../../utils/security');
const cockpitApiService = require('./aioiCockpitApiService');
const executiveQueryMetrics = require('./aioiExecutiveQueryMetrics');
const executiveSummaryQuery = require('./aioiExecutiveSummaryQuery');
const strategicOverviewQuery = require('./aioiStrategicOverviewQuery');
const decisionVisualizationQuery = require('./aioiDecisionVisualizationQuery');
const interfaceIntelligenceQuery = require('./aioiInterfaceIntelligenceQuery');

function createQueryCache() {
  return cockpitApiService.createRequestCache();
}

function _stripOk(res) {
  if (!res || !res.ok) return res;
  const { ok, error, ...query } = res;
  return query;
}

async function getExecutiveQueryBundle(companyId, cache = createQueryCache()) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  executiveQueryMetrics.recordExecutiveQueryRequested(companyId, 'bundle');
  const startMs = Date.now();

  try {
    const [
      summaryRes,
      overviewRes,
      decisionRes,
      interfaceRes
    ] = await Promise.all([
      executiveSummaryQuery.getExecutiveSummaryQuery(companyId, cache),
      strategicOverviewQuery.getStrategicOverviewQuery(companyId, cache),
      decisionVisualizationQuery.getDecisionVisualizationQuery(companyId, cache),
      interfaceIntelligenceQuery.getInterfaceIntelligenceQuery(companyId, cache)
    ]);

    if (!summaryRes.ok) {
      executiveQueryMetrics.recordError(companyId, 'getExecutiveQueryBundle', summaryRes.error);
      return { ok: false, error: summaryRes.error };
    }
    if (!overviewRes.ok) {
      executiveQueryMetrics.recordError(companyId, 'getExecutiveQueryBundle', overviewRes.error);
      return { ok: false, error: overviewRes.error };
    }
    if (!decisionRes.ok) {
      executiveQueryMetrics.recordError(companyId, 'getExecutiveQueryBundle', decisionRes.error);
      return { ok: false, error: decisionRes.error };
    }
    if (!interfaceRes.ok) {
      executiveQueryMetrics.recordError(companyId, 'getExecutiveQueryBundle', interfaceRes.error);
      return { ok: false, error: interfaceRes.error };
    }

    executiveQueryMetrics.recordExecutiveQueryCompleted(companyId, 'bundle', Date.now() - startMs);
    return {
      ok: true,
      executive_summary_query:      _stripOk(summaryRes),
      strategic_overview_query:     _stripOk(overviewRes),
      decision_visualization_query: _stripOk(decisionRes),
      interface_intelligence_query: _stripOk(interfaceRes)
    };
  } catch (err) {
    executiveQueryMetrics.recordError(companyId, 'getExecutiveQueryBundle', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  createQueryCache,
  getExecutiveSummaryQuery:      executiveSummaryQuery.getExecutiveSummaryQuery,
  getStrategicOverviewQuery:     strategicOverviewQuery.getStrategicOverviewQuery,
  getDecisionVisualizationQuery: decisionVisualizationQuery.getDecisionVisualizationQuery,
  getInterfaceIntelligenceQuery: interfaceIntelligenceQuery.getInterfaceIntelligenceQuery,
  getExecutiveQueryBundle,
  buildExecutiveSummaryQuery:      executiveSummaryQuery.buildExecutiveSummaryQuery,
  buildStrategicOverviewQuery:     strategicOverviewQuery.buildStrategicOverviewQuery,
  buildDecisionVisualizationQuery: decisionVisualizationQuery.buildDecisionVisualizationQuery,
  buildInterfaceIntelligenceQuery: interfaceIntelligenceQuery.buildInterfaceIntelligenceQuery
};
