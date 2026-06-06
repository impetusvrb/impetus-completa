'use strict';

/**
 * AIOI-P2.7 — Métricas e infraestrutura READ ONLY da Scenario Intelligence Layer
 */

const db = require('../../db');

const LAYER = 'AIOI_SCENARIO_METRICS';

const REDUCTION_FACTORS = Object.freeze({ pct10: 0.10, pct25: 0.25, pct50: 0.50 });
const EXPANSION_FACTORS = Object.freeze({ pct10: 1.10, pct25: 1.25, pct50: 1.50 });
const IMPROVEMENT_FACTORS = Object.freeze({ pct10: 0.10, pct25: 0.25, pct50: 0.50 });

const FORBIDDEN_SQL = Object.freeze([
  'INSERT', 'UPDATE', 'DELETE', 'MERGE', 'UPSERT', 'ALTER', 'TRUNCATE', 'DROP',
  'CREATE', 'GRANT', 'REVOKE'
]);

let _sessionCounters = {
  scenarioRequests:       0,
  backlogScenario:        0,
  slaScenario:            0,
  capacityScenario:       0,
  resilienceScenario:     0,
  errors:                 0,
  total_latency_ms:       0,
  latency_samples:        0
};

function assertReadOnlySql(sql) {
  const normalized = sql.trim().toUpperCase();
  for (const kw of FORBIDDEN_SQL) {
    if (normalized.startsWith(kw) || normalized.includes(` ${kw} `)) {
      throw new Error('READ_ONLY_LAYER_VIOLATION');
    }
  }
  if (normalized.includes('ON CONFLICT')) {
    throw new Error('READ_ONLY_LAYER_VIOLATION');
  }
}

async function withTenantReadClient(companyId, fn) {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`SELECT set_config('app.current_company_id', $1, true)`, [String(companyId)]);
    await client.query(`SELECT set_config('app.bypass_rls', 'false', true)`);
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

async function readQuery(client, sql, params) {
  assertReadOnlySql(sql);
  return client.query(sql, params);
}

function _recordLatency(ms) {
  if (typeof ms === 'number' && ms >= 0) {
    _sessionCounters.total_latency_ms += ms;
    _sessionCounters.latency_samples++;
  }
}

function recordScenarioRequested(companyId) {
  _sessionCounters.scenarioRequests++;
  console.info(`[${LAYER}] AIOI_SCENARIO_REQUESTED`, {
    company_id: companyId, session_total: _sessionCounters.scenarioRequests
  });
}

function recordScenarioCompleted(companyId, latencyMs) {
  _recordLatency(latencyMs);
  console.info(`[${LAYER}] AIOI_SCENARIO_COMPLETED`, {
    company_id: companyId, session_total: _sessionCounters.scenarioRequests
  });
}

function recordBacklogScenarioAnalyzed(companyId) {
  _sessionCounters.backlogScenario++;
  console.info(`[${LAYER}] AIOI_BACKLOG_SCENARIO_ANALYZED`, {
    company_id: companyId, session_total: _sessionCounters.backlogScenario
  });
}

function recordSlaScenarioAnalyzed(companyId) {
  _sessionCounters.slaScenario++;
  console.info(`[${LAYER}] AIOI_SLA_SCENARIO_ANALYZED`, {
    company_id: companyId, session_total: _sessionCounters.slaScenario
  });
}

function recordCapacityScenarioAnalyzed(companyId) {
  _sessionCounters.capacityScenario++;
  console.info(`[${LAYER}] AIOI_CAPACITY_SCENARIO_ANALYZED`, {
    company_id: companyId, session_total: _sessionCounters.capacityScenario
  });
}

function recordResilienceScenarioAnalyzed(companyId) {
  _sessionCounters.resilienceScenario++;
  console.info(`[${LAYER}] AIOI_RESILIENCE_SCENARIO_ANALYZED`, {
    company_id: companyId, session_total: _sessionCounters.resilienceScenario
  });
}

function recordError(companyId, context, error) {
  _sessionCounters.errors++;
  console.error(`[${LAYER}] AIOI_SCENARIO_ERROR`, {
    company_id: companyId,
    context:    context ? String(context).slice(0, 100) : 'unknown',
    error:      error ? String(error).slice(0, 200) : 'unknown',
    session_total: _sessionCounters.errors
  });
}

function getSessionCounters() {
  const avg = _sessionCounters.latency_samples > 0
    ? Math.round(_sessionCounters.total_latency_ms / _sessionCounters.latency_samples)
    : null;
  return {
    scenario_requests:          _sessionCounters.scenarioRequests,
    backlog_scenario_count:     _sessionCounters.backlogScenario,
    sla_scenario_count:         _sessionCounters.slaScenario,
    capacity_scenario_count:    _sessionCounters.capacityScenario,
    resilience_scenario_count:  _sessionCounters.resilienceScenario,
    scenario_error_count:       _sessionCounters.errors,
    avg_query_latency_ms:       avg
  };
}

function resetSessionCounters() {
  _sessionCounters = {
    scenarioRequests: 0, backlogScenario: 0, slaScenario: 0,
    capacityScenario: 0, resilienceScenario: 0, errors: 0,
    total_latency_ms: 0, latency_samples: 0
  };
}

function clampScore(score) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function clampNonNegative(value) {
  return Math.max(0, Math.round(value));
}

function applyReduction(current, reductionPct) {
  return clampNonNegative(current * (1 - reductionPct));
}

function applyExpansion(current, expansionFactor) {
  return clampNonNegative(current * expansionFactor);
}

function applyImprovement(currentScore, improvementPct) {
  const boost = currentScore * improvementPct;
  return clampScore(currentScore + boost);
}

function aggregateSlaStatus(slaAnalysis) {
  if (!slaAnalysis || !Object.keys(slaAnalysis).length) {
    return { status: 'within_sla', breach_count: 0, at_risk_count: 0, stages_within_sla: 0 };
  }
  const stages = Object.values(slaAnalysis);
  const breach_count = stages.filter(s => s.status === 'breached').length;
  const at_risk_count = stages.filter(s => s.status === 'at_risk').length;
  const stages_within_sla = stages.filter(s => s.status === 'within_sla').length;
  let status = 'within_sla';
  if (breach_count > 0) status = 'breached';
  else if (at_risk_count > 0) status = 'at_risk';
  return { status, breach_count, at_risk_count, stages_within_sla, total_stages: stages.length };
}

module.exports = {
  REDUCTION_FACTORS,
  EXPANSION_FACTORS,
  IMPROVEMENT_FACTORS,
  assertReadOnlySql,
  withTenantReadClient,
  readQuery,
  clampScore,
  clampNonNegative,
  applyReduction,
  applyExpansion,
  applyImprovement,
  aggregateSlaStatus,
  recordScenarioRequested,
  recordScenarioCompleted,
  recordBacklogScenarioAnalyzed,
  recordSlaScenarioAnalyzed,
  recordCapacityScenarioAnalyzed,
  recordResilienceScenarioAnalyzed,
  recordError,
  getSessionCounters,
  resetSessionCounters
};
