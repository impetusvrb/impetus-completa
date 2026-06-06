'use strict';

/**
 * AIOI-P2.2 — Executive Risk Forecast Service (READ ONLY)
 *
 * Risco projetado baseado em backlog forecast — sem IA, sem ML.
 */

const { isValidUUID } = require('../../utils/security');
const predMetrics = require('./aioiPredictiveMetrics');
const riskService = require('./aioiRiskAnalysisService');
const backlogForecastService = require('./aioiBacklogForecastService');

function buildRiskForecastFromBacklog(backlogForecast) {
  const b = backlogForecast;
  return {
    approval_risk_forecast:  riskService.classifyBacklogRisk(b.approval_backlog_forecast),
    execution_risk_forecast: riskService.classifyBacklogRisk(b.execution_backlog_forecast),
    outcome_risk_forecast:   riskService.classifyBacklogRisk(b.outcome_backlog_forecast),
    learning_risk_forecast:  riskService.classifyBacklogRisk(b.learning_backlog_forecast)
  };
}

async function getExecutiveRiskForecast(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  try {
    const backlogRes = await backlogForecastService.getBacklogForecast(companyId);
    if (!backlogRes.ok) {
      predMetrics.recordError(companyId, 'getExecutiveRiskForecast', backlogRes.error);
      return { ok: false, error: backlogRes.error };
    }

    const risk_forecast = buildRiskForecastFromBacklog(backlogRes.backlog_forecast);
    predMetrics.recordRiskForecastGenerated(companyId);
    return { ok: true, risk_forecast };

  } catch (err) {
    predMetrics.recordError(companyId, 'getExecutiveRiskForecast', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  buildRiskForecastFromBacklog,
  getExecutiveRiskForecast
};
