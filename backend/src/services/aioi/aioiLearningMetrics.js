'use strict';

/**
 * AIOI-P1.2 — Métricas da Learning Bridge Layer
 *
 * Observabilidade de submissões ao operationalLearningService (somente leitura + logs).
 */

const db = require('../../db');

const LAYER = 'AIOI_LEARNING_METRICS';

let _sessionCounters = {
  submitted:        0,
  processed:        0,
  alreadySubmitted: 0,
  skipped:          0,
  errors:           0,
  total_latency_ms: 0,
  latency_samples:  0
};

function recordSubmitted(companyId, ioeId, correlationId, latencyMs) {
  _sessionCounters.submitted++;
  if (typeof latencyMs === 'number' && latencyMs >= 0) {
    _sessionCounters.total_latency_ms += latencyMs;
    _sessionCounters.latency_samples++;
  }
  console.info(`[${LAYER}] AIOI_LEARNING_SUBMITTED`, {
    company_id:     companyId,
    ioe_id:         ioeId,
    correlation_id: correlationId,
    session_total:  _sessionCounters.submitted
  });
}

function recordProcessed(companyId, ioeId, correlationId) {
  _sessionCounters.processed++;
  console.info(`[${LAYER}] AIOI_LEARNING_PROCESSED`, {
    company_id:     companyId,
    ioe_id:         ioeId,
    correlation_id: correlationId,
    session_total:  _sessionCounters.processed
  });
}

function recordAlreadySubmitted(companyId, ioeId, correlationId) {
  _sessionCounters.alreadySubmitted++;
  console.info(`[${LAYER}] AIOI_LEARNING_ALREADY_SUBMITTED`, {
    company_id:     companyId,
    ioe_id:         ioeId,
    correlation_id: correlationId,
    session_total:  _sessionCounters.alreadySubmitted
  });
}

function recordSkipped(companyId, ioeId, correlationId, reason) {
  _sessionCounters.skipped++;
  console.info(`[${LAYER}] AIOI_LEARNING_SKIPPED`, {
    company_id:     companyId,
    ioe_id:         ioeId,
    correlation_id: correlationId,
    reason,
    session_total:  _sessionCounters.skipped
  });
}

function recordError(companyId, ioeId, correlationId, error) {
  _sessionCounters.errors++;
  console.error(`[${LAYER}] AIOI_LEARNING_ERROR`, {
    company_id:     companyId,
    ioe_id:         ioeId,
    correlation_id: correlationId,
    error:          error ? String(error).slice(0, 200) : 'unknown',
    session_total:  _sessionCounters.errors
  });
}

function getSessionCounters() {
  const avgLatency = _sessionCounters.latency_samples > 0
    ? Math.round(_sessionCounters.total_latency_ms / _sessionCounters.latency_samples)
    : null;
  return {
    learning_submitted_count:  _sessionCounters.submitted,
    learning_processed_count:  _sessionCounters.processed,
    learning_already_submitted_count: _sessionCounters.alreadySubmitted,
    learning_skipped_count:    _sessionCounters.skipped,
    learning_error_count:      _sessionCounters.errors,
    avg_learning_latency_ms:   avgLatency
  };
}

function resetSessionCounters() {
  _sessionCounters = {
    submitted:        0,
    processed:        0,
    alreadySubmitted: 0,
    skipped:          0,
    errors:           0,
    total_latency_ms: 0,
    latency_samples:  0
  };
}

/**
 * Consulta métricas de aprendizado por tenant (somente leitura, RLS ativo).
 *
 * @param {string} companyId
 * @returns {Promise<object>}
 */
async function getLearningMetrics(companyId) {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`SELECT set_config('app.current_company_id', $1, true)`, [String(companyId)]);
    await client.query(`SELECT set_config('app.bypass_rls', 'false', true)`);

    const result = await client.query(
      `SELECT
         COUNT(*) FILTER (
           WHERE decision_payload->>'aioi_learning_submitted' = 'true'
         ) AS submitted_count,
         COUNT(*) FILTER (
           WHERE decision_payload->>'aioi_learning_processed' = 'true'
         ) AS processed_count
       FROM industrial_operational_events
       WHERE company_id = $1::uuid`,
      [companyId]
    );

    await client.query('COMMIT');
    const row = result.rows[0] || {};
    return {
      learning_submitted_count: parseInt(row.submitted_count || '0', 10),
      learning_processed_count: parseInt(row.processed_count || '0', 10),
      learning_error_count:     _sessionCounters.errors,
      avg_learning_latency_ms:  _sessionCounters.latency_samples > 0
        ? Math.round(_sessionCounters.total_latency_ms / _sessionCounters.latency_samples)
        : null
    };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    return {
      learning_submitted_count: 0,
      learning_processed_count: 0,
      learning_error_count:     _sessionCounters.errors,
      avg_learning_latency_ms:  null
    };
  } finally {
    client.release();
  }
}

module.exports = {
  recordSubmitted,
  recordProcessed,
  recordAlreadySubmitted,
  recordSkipped,
  recordError,
  getSessionCounters,
  resetSessionCounters,
  getLearningMetrics
};
