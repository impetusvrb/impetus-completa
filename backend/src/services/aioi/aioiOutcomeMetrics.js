'use strict';

/**
 * AIOI-P1.1 — Métricas da Outcome Tracking Layer
 *
 * Observabilidade de captura de outcomes (somente leitura + logs).
 * Nunca invoca operationalLearningService nem persiste aprendizado.
 */

const db = require('../../db');

const LAYER = 'AIOI_OUTCOME_METRICS';

let _sessionCounters = {
  captured:       0,
  success:        0,
  failure:        0,
  skipped:        0,
  alreadyCaptured:0,
  errors:         0,
  contextGenerated:0,
  total_latency_ms:0,
  latency_samples: 0
};

function recordCaptured(companyId, ioeId, correlationId, outcomeStatus, latencyMs) {
  _sessionCounters.captured++;
  if (outcomeStatus === 'success' || outcomeStatus === 'partial_success') {
    _sessionCounters.success++;
  } else if (outcomeStatus === 'failure' || outcomeStatus === 'cancelled') {
    _sessionCounters.failure++;
  }
  if (typeof latencyMs === 'number' && latencyMs >= 0) {
    _sessionCounters.total_latency_ms += latencyMs;
    _sessionCounters.latency_samples++;
  }
  console.info(`[${LAYER}] AIOI_OUTCOME_CAPTURED`, {
    company_id:     companyId,
    ioe_id:         ioeId,
    correlation_id: correlationId,
    outcome_status: outcomeStatus,
    session_total:  _sessionCounters.captured
  });
}

function recordAlreadyCaptured(companyId, ioeId, correlationId) {
  _sessionCounters.alreadyCaptured++;
  console.info(`[${LAYER}] AIOI_OUTCOME_ALREADY_CAPTURED`, {
    company_id:     companyId,
    ioe_id:         ioeId,
    correlation_id: correlationId,
    session_total:  _sessionCounters.alreadyCaptured
  });
}

function recordSkipped(companyId, ioeId, correlationId, reason) {
  _sessionCounters.skipped++;
  console.info(`[${LAYER}] AIOI_OUTCOME_SKIPPED`, {
    company_id:     companyId,
    ioe_id:         ioeId,
    correlation_id: correlationId,
    reason,
    session_total:  _sessionCounters.skipped
  });
}

function recordError(companyId, ioeId, correlationId, error) {
  _sessionCounters.errors++;
  console.error(`[${LAYER}] AIOI_OUTCOME_ERROR`, {
    company_id:     companyId,
    ioe_id:         ioeId,
    correlation_id: correlationId,
    error:          error ? String(error).slice(0, 200) : 'unknown',
    session_total:  _sessionCounters.errors
  });
}

function recordContextGenerated(companyId, ioeId, correlationId) {
  _sessionCounters.contextGenerated++;
  console.info(`[${LAYER}] AIOI_OUTCOME_CONTEXT_GENERATED`, {
    company_id:     companyId,
    ioe_id:         ioeId,
    correlation_id: correlationId,
    session_total:  _sessionCounters.contextGenerated
  });
}

function getSessionCounters() {
  const avgLatency = _sessionCounters.latency_samples > 0
    ? Math.round(_sessionCounters.total_latency_ms / _sessionCounters.latency_samples)
    : null;
  return {
    outcome_captured_count:        _sessionCounters.captured,
    success_outcome_count:         _sessionCounters.success,
    failure_outcome_count:         _sessionCounters.failure,
    outcome_skipped_count:         _sessionCounters.skipped,
    outcome_already_captured_count:_sessionCounters.alreadyCaptured,
    outcome_error_count:           _sessionCounters.errors,
    context_generated_count:       _sessionCounters.contextGenerated,
    avg_outcome_capture_latency_ms: avgLatency
  };
}

function resetSessionCounters() {
  _sessionCounters = {
    captured:        0,
    success:         0,
    failure:         0,
    skipped:         0,
    alreadyCaptured: 0,
    errors:          0,
    contextGenerated:0,
    total_latency_ms:0,
    latency_samples: 0
  };
}

/**
 * Consulta métricas de outcome por tenant (somente leitura, RLS ativo).
 *
 * @param {string} companyId
 * @returns {Promise<object>}
 */
async function getOutcomeMetrics(companyId) {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`SELECT set_config('app.current_company_id', $1, true)`, [String(companyId)]);
    await client.query(`SELECT set_config('app.bypass_rls', 'false', true)`);

    const result = await client.query(
      `SELECT
         COUNT(*) FILTER (
           WHERE decision_payload->>'aioi_outcome_captured' = 'true'
         ) AS captured_count,
         COUNT(*) FILTER (
           WHERE decision_payload->'aioi_outcome'->>'outcome_status' IN ('success', 'partial_success')
         ) AS success_count,
         COUNT(*) FILTER (
           WHERE decision_payload->'aioi_outcome'->>'outcome_status' IN ('failure', 'cancelled')
         ) AS failure_count
       FROM industrial_operational_events
       WHERE company_id = $1::uuid`,
      [companyId]
    );

    await client.query('COMMIT');
    const row = result.rows[0] || {};
    return {
      outcome_captured_count: parseInt(row.captured_count || '0', 10),
      success_outcome_count:  parseInt(row.success_count || '0', 10),
      failure_outcome_count:  parseInt(row.failure_count || '0', 10),
      outcome_error_count:    _sessionCounters.errors,
      avg_outcome_capture_latency_ms: _sessionCounters.latency_samples > 0
        ? Math.round(_sessionCounters.total_latency_ms / _sessionCounters.latency_samples)
        : null
    };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    return {
      outcome_captured_count: 0,
      success_outcome_count:  0,
      failure_outcome_count:  0,
      outcome_error_count:    _sessionCounters.errors,
      avg_outcome_capture_latency_ms: null
    };
  } finally {
    client.release();
  }
}

module.exports = {
  recordCaptured,
  recordAlreadyCaptured,
  recordSkipped,
  recordError,
  recordContextGenerated,
  getSessionCounters,
  resetSessionCounters,
  getOutcomeMetrics
};
