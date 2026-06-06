'use strict';

/**
 * AIOI-P0.4 — Métricas do Decision Bridge Layer
 *
 * Responsabilidade: observabilidade de sugestões de decisão (somente leitura + logs).
 *
 * REGRAS:
 *   ✓ Nunca registrar decision_payload completo nos logs
 *   ✓ Nunca registrar dados sensíveis
 *   ✓ Registrar: company_id, ioe_id, correlation_id, decision_type
 *   ✓ Sem dashboard, sem API REST, sem worker
 */

const db = require('../../db');

const LAYER = 'AIOI_DECISION_METRICS';

let _sessionCounters = {
  requested:          0,
  received:           0,
  persisted:          0,
  skipped:            0,
  errors:             0,
  pending_decisions:  0,
  generated_decisions:0
};

function recordRequested(companyId, ioeId, correlationId) {
  _sessionCounters.requested++;
  console.info(`[${LAYER}] AIOI_DECISION_REQUESTED`, {
    company_id:     companyId,
    ioe_id:         ioeId,
    correlation_id: correlationId,
    session_total:  _sessionCounters.requested
  });
}

function recordReceived(companyId, ioeId, correlationId, decisionType) {
  _sessionCounters.received++;
  console.info(`[${LAYER}] AIOI_DECISION_RECEIVED`, {
    company_id:     companyId,
    ioe_id:         ioeId,
    correlation_id: correlationId,
    decision_type:  decisionType,
    session_total:  _sessionCounters.received
  });
}

function recordPersisted(companyId, ioeId, correlationId, decisionType) {
  _sessionCounters.persisted++;
  _sessionCounters.generated_decisions++;
  console.info(`[${LAYER}] AIOI_DECISION_PERSISTED`, {
    company_id:     companyId,
    ioe_id:         ioeId,
    correlation_id: correlationId,
    decision_type:  decisionType,
    session_total:  _sessionCounters.persisted
  });
}

function recordSkipped(companyId, ioeId, correlationId, reason) {
  _sessionCounters.skipped++;
  console.info(`[${LAYER}] AIOI_DECISION_SKIPPED`, {
    company_id:     companyId,
    ioe_id:         ioeId,
    correlation_id: correlationId,
    reason,
    session_total:  _sessionCounters.skipped
  });
}

function recordError(companyId, ioeId, correlationId, error) {
  _sessionCounters.errors++;
  console.error(`[${LAYER}] AIOI_DECISION_ERROR`, {
    company_id:     companyId,
    ioe_id:         ioeId,
    correlation_id: correlationId,
    error:          error ? String(error).slice(0, 200) : 'unknown',
    session_total:  _sessionCounters.errors
  });
}

function getSessionCounters() {
  return { ..._sessionCounters };
}

function resetSessionCounters() {
  _sessionCounters = {
    requested:           0,
    received:            0,
    persisted:           0,
    skipped:             0,
    errors:              0,
    pending_decisions:   0,
    generated_decisions: 0
  };
}

/**
 * Consulta métricas de decisão por tenant (somente leitura, RLS ativo).
 *
 * @param {string} companyId
 * @returns {Promise<{
 *   pending_decisions: number,
 *   generated_decisions: number,
 *   skipped_decisions: number,
 *   decision_error_count: number
 * }>}
 */
async function getDecisionMetrics(companyId) {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`SELECT set_config('app.current_company_id', $1, true)`, [String(companyId)]);
    await client.query(`SELECT set_config('app.bypass_rls', 'false', true)`);

    const result = await client.query(
      `SELECT
         COUNT(*) FILTER (
           WHERE status = 'triaged'
             AND decision_type IS NULL
             AND decision_payload IS NULL
         ) AS pending_decisions,
         COUNT(*) FILTER (
           WHERE status = 'triaged'
             AND decision_type IS NOT NULL
             AND decision_payload IS NOT NULL
         ) AS generated_decisions,
         COUNT(*) FILTER (
           WHERE status = 'triaged'
             AND decision_type IS NOT NULL
             AND decision_payload IS NOT NULL
             AND approved_by_user_id IS NULL
         ) AS hitl_pending_decisions
       FROM industrial_operational_events
       WHERE company_id = $1::uuid`,
      [companyId]
    );

    await client.query('COMMIT');

    const row = result.rows[0] || {};
    return {
      pending_decisions:    parseInt(row.pending_decisions    || '0', 10),
      generated_decisions:  parseInt(row.generated_decisions  || '0', 10),
      skipped_decisions:    _sessionCounters.skipped,
      decision_error_count: _sessionCounters.errors
    };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error(`[${LAYER}] Erro ao coletar métricas de decisão`, {
      company_id: companyId,
      error: err.message
    });
    return {
      pending_decisions:    0,
      generated_decisions:  0,
      skipped_decisions:    _sessionCounters.skipped,
      decision_error_count: _sessionCounters.errors
    };
  } finally {
    client.release();
  }
}

module.exports = {
  recordRequested,
  recordReceived,
  recordPersisted,
  recordSkipped,
  recordError,
  getSessionCounters,
  resetSessionCounters,
  getDecisionMetrics
};
