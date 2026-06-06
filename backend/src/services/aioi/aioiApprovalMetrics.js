'use strict';

/**
 * AIOI-P0.5 — Métricas da camada HITL Approval
 *
 * Observabilidade de aprovações humanas (somente leitura + logs).
 * Nunca registra decision_payload completo nem dados sensíveis.
 */

const db = require('../../db');

const LAYER = 'AIOI_APPROVAL_METRICS';

let _sessionCounters = {
  pending_approval: 0,
  approved:         0,
  rejected:         0,
  skipped:          0,
  errors:           0,
  total_latency_ms: 0,
  latency_samples:  0
};

function recordPendingApproval(companyId, ioeId, correlationId) {
  _sessionCounters.pending_approval++;
  console.info(`[${LAYER}] AIOI_PENDING_APPROVAL`, {
    company_id:     companyId,
    ioe_id:         ioeId,
    correlation_id: correlationId,
    session_total:  _sessionCounters.pending_approval
  });
}

function recordApproved(companyId, ioeId, correlationId, decisionType, latencyMs) {
  _sessionCounters.approved++;
  if (typeof latencyMs === 'number' && latencyMs >= 0) {
    _sessionCounters.total_latency_ms += latencyMs;
    _sessionCounters.latency_samples++;
  }
  console.info(`[${LAYER}] AIOI_APPROVED`, {
    company_id:     companyId,
    ioe_id:         ioeId,
    correlation_id: correlationId,
    decision_type:  decisionType,
    session_total:  _sessionCounters.approved
  });
}

function recordRejected(companyId, ioeId, correlationId, decisionType) {
  _sessionCounters.rejected++;
  console.info(`[${LAYER}] AIOI_REJECTED`, {
    company_id:     companyId,
    ioe_id:         ioeId,
    correlation_id: correlationId,
    decision_type:  decisionType,
    session_total:  _sessionCounters.rejected
  });
}

function recordSkipped(companyId, ioeId, correlationId, reason) {
  _sessionCounters.skipped++;
  console.info(`[${LAYER}] AIOI_APPROVAL_SKIPPED`, {
    company_id:     companyId,
    ioe_id:         ioeId,
    correlation_id: correlationId,
    reason,
    session_total:  _sessionCounters.skipped
  });
}

function recordError(companyId, ioeId, correlationId, error) {
  _sessionCounters.errors++;
  console.error(`[${LAYER}] AIOI_APPROVAL_ERROR`, {
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
    pending_approval_count: _sessionCounters.pending_approval,
    approved_count:         _sessionCounters.approved,
    rejected_count:         _sessionCounters.rejected,
    approval_error_count:   _sessionCounters.errors,
    approval_latency_ms:    avgLatency,
    skipped_count:          _sessionCounters.skipped
  };
}

function resetSessionCounters() {
  _sessionCounters = {
    pending_approval: 0,
    approved:         0,
    rejected:         0,
    skipped:          0,
    errors:           0,
    total_latency_ms: 0,
    latency_samples:  0
  };
}

/**
 * Consulta métricas de aprovação por tenant (somente leitura, RLS ativo).
 *
 * @param {string} companyId
 * @returns {Promise<{
 *   pending_approval_count: number,
 *   approved_count: number,
 *   rejected_count: number,
 *   approval_error_count: number
 * }>}
 */
async function getApprovalMetrics(companyId) {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`SELECT set_config('app.current_company_id', $1, true)`, [String(companyId)]);
    await client.query(`SELECT set_config('app.bypass_rls', 'false', true)`);

    const result = await client.query(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'pending_approval') AS pending_approval_count,
         COUNT(*) FILTER (WHERE status = 'approved')         AS approved_count,
         COUNT(*) FILTER (WHERE status = 'rejected')         AS rejected_count
       FROM industrial_operational_events
       WHERE company_id = $1::uuid
         AND decision_type IS NOT NULL`,
      [companyId]
    );

    await client.query('COMMIT');

    const row = result.rows[0] || {};
    return {
      pending_approval_count: parseInt(row.pending_approval_count || '0', 10),
      approved_count:         parseInt(row.approved_count         || '0', 10),
      rejected_count:         parseInt(row.rejected_count         || '0', 10),
      approval_error_count:   _sessionCounters.errors
    };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error(`[${LAYER}] Erro ao coletar métricas de aprovação`, {
      company_id: companyId,
      error: err.message
    });
    return {
      pending_approval_count: 0,
      approved_count:         0,
      rejected_count:         0,
      approval_error_count:   _sessionCounters.errors
    };
  } finally {
    client.release();
  }
}

module.exports = {
  recordPendingApproval,
  recordApproved,
  recordRejected,
  recordSkipped,
  recordError,
  getSessionCounters,
  resetSessionCounters,
  getApprovalMetrics
};
