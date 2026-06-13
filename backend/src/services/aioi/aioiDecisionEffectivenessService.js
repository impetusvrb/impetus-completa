'use strict';

/**
 * AIOI-P8.3 — Decision Effectiveness Analytics Service
 *
 * Métricas de eficácia histórica — estatística only, sem inferência.
 * Spec: backend/docs/AIOI_DECISION_EFFECTIVENESS_SPECIFICATION.md
 */

const db = require('../../db');
const pilotFlags = require('./aioiPilotFlags');
const decisionMetrics = require('./aioiDecisionMetrics');
const executionMetrics = require('./aioiExecutionMetrics');
const learningMetrics = require('./aioiLearningMetrics');

const LAYER = 'AIOI_DECISION_EFFECTIVENESS';

const SUCCESS_OUTCOMES = new Set(['resolved', 'success', 'completed']);
const PARTIAL_OUTCOMES = new Set(['escalated', 'partial', 'deferred']);
const FAILURE_OUTCOMES = new Set(['rejected', 'failed', 'cancelled']);

async function _queryOutcomeStats(tenantIds) {
  if (!tenantIds.length) {
    return { total: 0, success: 0, partial: 0, failure: 0, unknown: 0, distribution: [] };
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`SELECT set_config('app.bypass_rls', 'true', true)`);

    const result = await client.query(
      `SELECT
         decision_payload->'aioi_outcome'->>'outcome_type' AS outcome_type,
         COUNT(*) AS cnt
       FROM industrial_operational_events
       WHERE company_id = ANY($1::uuid[])
         AND decision_payload->'aioi_outcome' IS NOT NULL
       GROUP BY outcome_type`,
      [tenantIds]
    );

    await client.query('COMMIT');

    const distribution = (result.rows || []).map(r => ({
      outcome_type: (r.outcome_type || 'unknown').toLowerCase(),
      count:        parseInt(r.cnt || '0', 10)
    }));

    let success = 0; let partial = 0; let failure = 0; let unknown = 0;
    for (const d of distribution) {
      if (SUCCESS_OUTCOMES.has(d.outcome_type)) success += d.count;
      else if (PARTIAL_OUTCOMES.has(d.outcome_type)) partial += d.count;
      else if (FAILURE_OUTCOMES.has(d.outcome_type)) failure += d.count;
      else unknown += d.count;
    }

    const total = success + partial + failure + unknown;
    return { total, success, partial, failure, unknown, distribution };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    return { total: 0, success: 0, partial: 0, failure: 0, unknown: 0, distribution: [] };
  } finally {
    client.release();
  }
}

async function _queryExecutionDistribution(tenantIds) {
  if (!tenantIds.length) return [];
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`SELECT set_config('app.bypass_rls', 'true', true)`);
    const result = await client.query(
      `SELECT decision_type, status, COUNT(*) AS cnt
       FROM industrial_operational_events
       WHERE company_id = ANY($1::uuid[])
         AND decision_type IN ('direct_action', 'workflow')
       GROUP BY decision_type, status`,
      [tenantIds]
    );
    await client.query('COMMIT');
    return (result.rows || []).map(r => ({
      decision_type: r.decision_type,
      status:        r.status,
      count:         parseInt(r.cnt || '0', 10)
    }));
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    return [];
  } finally {
    client.release();
  }
}

async function _queryLearningDistribution(tenantIds) {
  if (!tenantIds.length) return { submitted: 0, not_submitted: 0 };
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`SELECT set_config('app.bypass_rls', 'true', true)`);
    const result = await client.query(
      `SELECT
         COUNT(*) FILTER (WHERE decision_payload->>'aioi_learning_submitted' = 'true') AS submitted,
         COUNT(*) FILTER (WHERE decision_payload->>'aioi_learning_submitted' IS DISTINCT FROM 'true'
           AND status IN ('resolved', 'closed')) AS not_submitted
       FROM industrial_operational_events
       WHERE company_id = ANY($1::uuid[])`,
      [tenantIds]
    );
    await client.query('COMMIT');
    const row = result.rows[0] || {};
    return {
      submitted:     parseInt(row.submitted || '0', 10),
      not_submitted: parseInt(row.not_submitted || '0', 10)
    };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    return { submitted: 0, not_submitted: 0 };
  } finally {
    client.release();
  }
}

function _rate(numerator, denominator) {
  if (!denominator) return 0;
  return Math.round((numerator / denominator) * 10000) / 100;
}

/**
 * Analytics de eficácia de decisões — histórico estatístico.
 * @returns {Promise<object>}
 */
async function getDecisionEffectiveness() {
  const tenants = pilotFlags.getPilotTenants();
  const [outcomes, executionDist, learningDist] = await Promise.all([
    _queryOutcomeStats(tenants),
    _queryExecutionDistribution(tenants),
    _queryLearningDistribution(tenants)
  ]);

  const decisionSession = decisionMetrics.getSessionCounters();
  const executionSession = executionMetrics.getSessionCounters();
  const learningSession = learningMetrics.getSessionCounters();

  return {
    ok: true,
    layer: LAYER,
    success_rate:         _rate(outcomes.success, outcomes.total),
    partial_success_rate: _rate(outcomes.partial, outcomes.total),
    failure_rate:         _rate(outcomes.failure, outcomes.total),
    outcome_distribution: outcomes.distribution,
    execution_distribution: {
      database:  executionDist,
      session:   executionSession
    },
    learning_distribution: {
      database:  learningDist,
      session:   learningSession
    },
    effectiveness_summary: {
      total_outcomes:      outcomes.total,
      success_count:       outcomes.success,
      partial_count:       outcomes.partial,
      failure_count:       outcomes.failure,
      decisions_generated: decisionSession.generated_decisions,
      inference_enabled:   false,
      prediction_enabled:  false
    },
    captured_at: new Date().toISOString()
  };
}

module.exports = {
  getDecisionEffectiveness,
  LAYER
};
