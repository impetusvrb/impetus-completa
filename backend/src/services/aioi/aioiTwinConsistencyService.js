'use strict';

/**
 * AIOI-P2.8 — Twin Consistency Service (READ ONLY)
 *
 * Coerência entre estado atual, futuro e cenários — cálculo determinístico.
 */

const { isValidUUID } = require('../../utils/security');
const twinMetrics = require('./aioiDigitalTwinMetrics');
const operationalStateService = require('./aioiOperationalStateService');
const futureStateService = require('./aioiFutureStateService');
const scenarioStateService = require('./aioiScenarioStateService');

const RISK_RANK = Object.freeze({ low: 1, medium: 2, high: 3, critical: 4 });

function _backlogConsistencyScore(currentBacklog, forecastTotal, reducedBacklog50) {
  if (currentBacklog <= 0 && forecastTotal <= 0) return 25;
  const forecastDelta = twinMetrics.relativeDelta(currentBacklog, forecastTotal);
  let score = 25;
  if (forecastDelta > 0.5) score = 5;
  else if (forecastDelta > 0.25) score = 15;
  if (reducedBacklog50 < currentBacklog && reducedBacklog50 <= forecastTotal) score = Math.min(25, score + 5);
  return Math.min(25, score);
}

function _slaConsistencyScore(currentSla, slaForecast, recovery50) {
  const currentBreaches = currentSla?.breach_count ?? 0;
  const forecastBreaches = slaForecast
    ? Object.values(slaForecast).filter(s => s.forecast_status === 'breached').length
    : 0;
  const recoveryBreaches = recovery50?.breach_count ?? currentBreaches;

  let score = 25;
  if (forecastBreaches > currentBreaches + 1) score = 5;
  else if (forecastBreaches > currentBreaches) score = 15;
  if (recoveryBreaches < currentBreaches) score = Math.min(25, score + 5);
  return Math.min(25, score);
}

function _capacityConsistencyScore(currentCapacity, forecastCapacity, expanded50) {
  if (currentCapacity <= 0 && forecastCapacity <= 0) return 25;
  const delta = twinMetrics.relativeDelta(currentCapacity, forecastCapacity);
  let score = 25;
  if (delta > 0.4) score = 5;
  else if (delta > 0.2) score = 15;
  if (expanded50 > currentCapacity && expanded50 >= forecastCapacity) score = Math.min(25, score + 5);
  return Math.min(25, score);
}

function _resilienceConsistencyScore(resilienceStatus, riskForecast, improved50) {
  const rank = { fragile: 1, resilient: 2, highly_resilient: 3 };
  const currentRank = rank[resilienceStatus] || 1;
  const maxRisk = riskForecast
    ? Math.max(...Object.values(riskForecast).map(r => RISK_RANK[r] || 1))
    : 1;
  const improvedScore = improved50?.resilience_score ?? 0;

  let score = 25;
  if (currentRank === 1 && maxRisk >= 3) score = 5;
  else if (currentRank <= 2 && maxRisk >= 3) score = 15;
  if (improvedScore > 70 && maxRisk <= 2) score = Math.min(25, score + 5);
  return Math.min(25, score);
}

function computeTwinConsistencyScore({ operationalState, futureState, scenarioState }) {
  const currentBacklog = scenarioState.backlog_scenarios?.current_backlog ?? 0;
  const forecastTotal = twinMetrics.sumBacklogForecast(futureState.backlog_forecast);
  const reduced50 = scenarioState.backlog_scenarios?.reduced_backlog_50 ?? currentBacklog;

  const backlogScore = _backlogConsistencyScore(currentBacklog, forecastTotal, reduced50);
  const slaScore = _slaConsistencyScore(
    scenarioState.sla_scenarios?.current_sla_status,
    futureState.sla_forecast,
    scenarioState.sla_scenarios?.recovery_50pct
  );
  const capacityScore = _capacityConsistencyScore(
    scenarioState.capacity_scenarios?.current_capacity ?? 0,
    futureState.capacity_forecast?.estimated_daily_throughput ?? 0,
    scenarioState.capacity_scenarios?.expanded_50pct ?? 0
  );
  const resilienceScore = _resilienceConsistencyScore(
    operationalState.resilience_status,
    futureState.risk_forecast,
    scenarioState.resilience_scenarios?.improved_50pct
  );

  return twinMetrics.clampScore(backlogScore + slaScore + capacityScore + resilienceScore);
}

function buildTwinConsistency({ operationalState, futureState, scenarioState }) {
  const consistency_score = computeTwinConsistencyScore({
    operationalState, futureState, scenarioState
  });
  return {
    consistency_score,
    consistency_status: twinMetrics.classifyConsistencyStatus(consistency_score)
  };
}

async function getTwinConsistency(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  try {
    const [opRes, futureRes, scenRes] = await Promise.all([
      operationalStateService.getOperationalState(companyId),
      futureStateService.getFutureState(companyId),
      scenarioStateService.getScenarioState(companyId)
    ]);

    const failures = [opRes, futureRes, scenRes].filter(r => !r.ok);
    if (failures.length) {
      twinMetrics.recordError(companyId, 'getTwinConsistency', failures[0].error);
      return { ok: false, error: failures[0].error };
    }

    const twin_consistency = buildTwinConsistency({
      operationalState: opRes.operational_state,
      futureState:      futureRes.future_state,
      scenarioState:    scenRes.scenario_state
    });

    twinMetrics.recordTwinConsistencyAnalyzed(companyId);
    return { ok: true, twin_consistency };

  } catch (err) {
    twinMetrics.recordError(companyId, 'getTwinConsistency', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  RISK_RANK,
  computeTwinConsistencyScore,
  buildTwinConsistency,
  getTwinConsistency
};
