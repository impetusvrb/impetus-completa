'use strict';

/**
 * AIOI-P2.2 — Predictive Governance Read Model Service (READ ONLY)
 *
 * Agregador da camada preditiva + governance read model P2.1.
 */

const { isValidUUID } = require('../../utils/security');
const predMetrics = require('./aioiPredictiveMetrics');
const governanceReadModel = require('./aioiGovernanceReadModelService');
const backlogForecastService = require('./aioiBacklogForecastService');
const slaForecastService = require('./aioiSlaForecastService');
const capacityForecastService = require('./aioiCapacityForecastService');
const riskForecastService = require('./aioiRiskForecastService');

async function getPredictiveGovernanceReadModel(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  predMetrics.recordForecastRequested(companyId);
  const startMs = Date.now();

  try {
    const [
      govRes,
      backlogRes,
      slaRes,
      capacityRes,
      riskRes
    ] = await Promise.all([
      governanceReadModel.getGovernanceReadModel(companyId),
      backlogForecastService.getBacklogForecast(companyId),
      slaForecastService.getSlaBreachForecast(companyId),
      capacityForecastService.getOperationalCapacityForecast(companyId),
      riskForecastService.getExecutiveRiskForecast(companyId)
    ]);

    const failures = [govRes, backlogRes, slaRes, capacityRes, riskRes].filter(r => !r.ok);
    if (failures.length > 0) {
      predMetrics.recordError(companyId, 'getPredictiveGovernanceReadModel', failures[0].error);
      return { ok: false, error: failures[0].error };
    }

    predMetrics.recordForecastCompleted(companyId, Date.now() - startMs);

    return {
      ok: true,
      predictive_governance_read_model: {
        governance_read_model: govRes.governance_read_model,
        backlog_forecast:        backlogRes.backlog_forecast,
        sla_breach_forecast:     slaRes.sla_breach_forecast,
        capacity_forecast:       capacityRes.capacity_forecast,
        risk_forecast:           riskRes.risk_forecast
      }
    };

  } catch (err) {
    predMetrics.recordError(companyId, 'getPredictiveGovernanceReadModel', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  getPredictiveGovernanceReadModel
};
