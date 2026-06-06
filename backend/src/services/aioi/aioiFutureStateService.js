'use strict';

/**
 * AIOI-P2.8 — Future State Service (READ ONLY)
 *
 * Estado futuro provável — reutiliza forecasts P2.2, sem forecasting novo.
 */

const { isValidUUID } = require('../../utils/security');
const twinMetrics = require('./aioiDigitalTwinMetrics');
const backlogForecastService = require('./aioiBacklogForecastService');
const slaForecastService = require('./aioiSlaForecastService');
const capacityForecastService = require('./aioiCapacityForecastService');
const riskForecastService = require('./aioiRiskForecastService');

function buildFutureState({ backlogForecast, slaForecast, capacityForecast, riskForecast }) {
  return {
    backlog_forecast:  backlogForecast,
    sla_forecast:      slaForecast,
    capacity_forecast: capacityForecast,
    risk_forecast:     riskForecast
  };
}

async function getFutureState(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  try {
    const [backlogRes, slaRes, capacityRes, riskRes] = await Promise.all([
      backlogForecastService.getBacklogForecast(companyId),
      slaForecastService.getSlaBreachForecast(companyId),
      capacityForecastService.getOperationalCapacityForecast(companyId),
      riskForecastService.getExecutiveRiskForecast(companyId)
    ]);

    const failures = [backlogRes, slaRes, capacityRes, riskRes].filter(r => !r.ok);
    if (failures.length) {
      twinMetrics.recordError(companyId, 'getFutureState', failures[0].error);
      return { ok: false, error: failures[0].error };
    }

    const future_state = buildFutureState({
      backlogForecast:  backlogRes.backlog_forecast,
      slaForecast:      slaRes.sla_breach_forecast,
      capacityForecast: capacityRes.capacity_forecast,
      riskForecast:     riskRes.risk_forecast
    });

    twinMetrics.recordFutureStateAnalyzed(companyId);
    return { ok: true, future_state };

  } catch (err) {
    twinMetrics.recordError(companyId, 'getFutureState', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  buildFutureState,
  getFutureState
};
