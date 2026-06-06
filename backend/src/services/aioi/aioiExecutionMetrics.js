'use strict';

/**
 * AIOI-P1.0 — Métricas da Execution Bridge Layer
 *
 * Observabilidade de delegações de execução (somente leitura + logs).
 * Nunca registra decision_payload completo nem dados sensíveis.
 */

const db = require('../../db');

const LAYER = 'AIOI_EXECUTION_METRICS';

let _sessionCounters = {
  requested:       0,
  delegated:       0,
  skipped:         0,
  alreadyDelegated:0,
  errors:          0,
  total_latency_ms:0,
  latency_samples: 0
};

function recordRequested(companyId, ioeId, correlationId, decisionType) {
  _sessionCounters.requested++;
  console.info(`[${LAYER}] AIOI_EXECUTION_REQUESTED`, {
    company_id:     companyId,
    ioe_id:         ioeId,
    correlation_id: correlationId,
    decision_type:  decisionType,
    session_total:  _sessionCounters.requested
  });
}

function recordDelegated(companyId, ioeId, correlationId, target, refId, latencyMs) {
  _sessionCounters.delegated++;
  if (typeof latencyMs === 'number' && latencyMs >= 0) {
    _sessionCounters.total_latency_ms += latencyMs;
    _sessionCounters.latency_samples++;
  }
  console.info(`[${LAYER}] AIOI_EXECUTION_DELEGATED`, {
    company_id:     companyId,
    ioe_id:         ioeId,
    correlation_id: correlationId,
    target,
    ref_id:         refId,
    session_total:  _sessionCounters.delegated
  });
}

function recordSkipped(companyId, ioeId, correlationId, reason) {
  _sessionCounters.skipped++;
  console.info(`[${LAYER}] AIOI_EXECUTION_SKIPPED`, {
    company_id:     companyId,
    ioe_id:         ioeId,
    correlation_id: correlationId,
    reason,
    session_total:  _sessionCounters.skipped
  });
}

function recordAlreadyDelegated(companyId, ioeId, correlationId) {
  _sessionCounters.alreadyDelegated++;
  console.info(`[${LAYER}] AIOI_EXECUTION_ALREADY_DELEGATED`, {
    company_id:     companyId,
    ioe_id:         ioeId,
    correlation_id: correlationId,
    session_total:  _sessionCounters.alreadyDelegated
  });
}

function recordError(companyId, ioeId, correlationId, error) {
  _sessionCounters.errors++;
  console.error(`[${LAYER}] AIOI_EXECUTION_ERROR`, {
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
    execution_requested_count:  _sessionCounters.requested,
    execution_delegated_count:  _sessionCounters.delegated,
    execution_skipped_count:    _sessionCounters.skipped,
    execution_error_count:    _sessionCounters.errors,
    already_delegated_count:    _sessionCounters.alreadyDelegated,
    avg_execution_latency_ms:   avgLatency
  };
}

function resetSessionCounters() {
  _sessionCounters = {
    requested:        0,
    delegated:        0,
    skipped:          0,
    alreadyDelegated: 0,
    errors:           0,
    total_latency_ms: 0,
    latency_samples:  0
  };
}

/**
 * Consulta métricas de execução por tenant (somente leitura, RLS ativo).
 *
 * @param {string} companyId
 * @returns {Promise<object>}
 */
async function getExecutionMetrics(companyId) {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`SELECT set_config('app.current_company_id', $1, true)`, [String(companyId)]);
    await client.query(`SELECT set_config('app.bypass_rls', 'false', true)`);

    const result = await client.query(
      `SELECT
         COUNT(*) FILTER (
           WHERE status = 'approved'
             AND approved_by_user_id IS NOT NULL
             AND execution_trace_id IS NULL
             AND workflow_instance_id IS NULL
         ) AS pending_execution_count,
         COUNT(*) FILTER (
           WHERE status = 'in_progress'
             AND (execution_trace_id IS NOT NULL OR workflow_instance_id IS NOT NULL)
         ) AS delegated_count
       FROM industrial_operational_events
       WHERE company_id = $1::uuid`,
      [companyId]
    );

    await client.query('COMMIT');
    const row = result.rows[0] || {};
    return {
      execution_requested_count:  _sessionCounters.requested,
      execution_delegated_count:  parseInt(row.delegated_count || '0', 10),
      execution_skipped_count:    _sessionCounters.skipped,
      execution_error_count:    _sessionCounters.errors,
      pending_execution_count:  parseInt(row.pending_execution_count || '0', 10)
    };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    return {
      execution_requested_count:  _sessionCounters.requested,
      execution_delegated_count:  0,
      execution_skipped_count:    _sessionCounters.skipped,
      execution_error_count:    _sessionCounters.errors,
      pending_execution_count:  0
    };
  } finally {
    client.release();
  }
}

module.exports = {
  recordRequested,
  recordDelegated,
  recordSkipped,
  recordAlreadyDelegated,
  recordError,
  getSessionCounters,
  resetSessionCounters,
  getExecutionMetrics
};
