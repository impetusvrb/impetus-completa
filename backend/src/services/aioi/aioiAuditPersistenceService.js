'use strict';

/**
 * AIOI-P1.4 — Audit Persistence Service
 *
 * Persistência imutável de eventos de auditoria em aioi_audit_events.
 *
 * PROIBIÇÕES (PERSIST-03 / PERSIST-04):
 *   ✗ UPDATE/DELETE em qualquer tabela
 *   ✗ INSERT em industrial_operational_events / aioi_outbox
 *   ✗ Soberanos funcionais
 *   ✗ Alteração de estado operacional
 */

const db = require('../../db');
const { isValidUUID } = require('../../utils/security');
const metrics = require('./aioiPersistenceMetrics');

const LAYER = 'AIOI_AUDIT_PERSISTENCE';
const TABLE = 'aioi_audit_events';

const VALID_EVENT_TYPES = Object.freeze([
  'AIOI_PENDING_APPROVAL',
  'AIOI_APPROVED',
  'AIOI_REJECTED',
  'AIOI_EXECUTION_REQUESTED',
  'AIOI_EXECUTION_DELEGATED',
  'AIOI_OUTCOME_CAPTURED',
  'AIOI_LEARNING_SUBMITTED',
  'AIOI_LEARNING_PROCESSED',
  'AIOI_AUDIT_REQUESTED'
]);

async function _withTenantClient(companyId, fn) {
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

/**
 * Persiste evento de auditoria (idempotente).
 *
 * @param {object} params
 * @returns {Promise<object>}
 */
async function persistAuditEvent({
  companyId,
  ioeId,
  correlationId,
  eventType,
  eventSource,
  payload
}) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }
  if (!correlationId || String(correlationId).trim() === '') {
    return { ok: false, error: 'correlationId obrigatório' };
  }
  if (!eventType || !VALID_EVENT_TYPES.includes(eventType)) {
    return { ok: false, error: 'eventType inválido' };
  }
  if (!eventSource || String(eventSource).trim() === '') {
    return { ok: false, error: 'eventSource obrigatório' };
  }

  metrics.assertAllowedTable(TABLE);

  const sql = `INSERT INTO ${TABLE}
    (company_id, ioe_id, correlation_id, event_type, event_source, payload)
    VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6::jsonb)
    ON CONFLICT (company_id, correlation_id, event_type) DO NOTHING
    RETURNING id`;

  metrics.assertInsertOnlySql(sql);

  try {
    const row = await _withTenantClient(companyId, async (client) => {
      const result = await client.query(sql, [
        companyId,
        ioeId && isValidUUID(String(ioeId)) ? ioeId : null,
        String(correlationId).trim(),
        eventType,
        String(eventSource).trim(),
        JSON.stringify(payload || {})
      ]);
      return result.rows[0] || null;
    });

    if (!row) {
      metrics.recordSkipped(companyId, `audit_duplicate:${eventType}`);
      return { ok: true, alreadyPersisted: true };
    }

    metrics.recordAuditPersisted(companyId, eventType, ioeId);
    return { ok: true, persisted: true, id: row.id };

  } catch (err) {
    metrics.recordError(companyId, 'persistAuditEvent', err.message);
    return { ok: false, error: err.message };
  }
}

async function persistApprovalAudit({ companyId, ioeId, correlationId, action, payload }) {
  const typeMap = {
    pending: 'AIOI_PENDING_APPROVAL',
    approved: 'AIOI_APPROVED',
    rejected: 'AIOI_REJECTED'
  };
  const eventType = typeMap[action] || 'AIOI_PENDING_APPROVAL';
  return persistAuditEvent({
    companyId,
    ioeId,
    correlationId,
    eventType,
    eventSource: 'aioi_approval_layer',
    payload: { action, ...(payload || {}) }
  });
}

async function persistExecutionAudit({ companyId, ioeId, correlationId, phase, payload }) {
  const eventType = phase === 'delegated'
    ? 'AIOI_EXECUTION_DELEGATED'
    : 'AIOI_EXECUTION_REQUESTED';
  return persistAuditEvent({
    companyId,
    ioeId,
    correlationId,
    eventType,
    eventSource: 'aioi_execution_bridge',
    payload: { phase, ...(payload || {}) }
  });
}

async function persistOutcomeAudit({ companyId, ioeId, correlationId, payload }) {
  return persistAuditEvent({
    companyId,
    ioeId,
    correlationId,
    eventType: 'AIOI_OUTCOME_CAPTURED',
    eventSource: 'aioi_outcome_tracking',
    payload: payload || {}
  });
}

async function persistLearningAudit({ companyId, ioeId, correlationId, phase, payload }) {
  const eventType = phase === 'processed'
    ? 'AIOI_LEARNING_PROCESSED'
    : 'AIOI_LEARNING_SUBMITTED';
  return persistAuditEvent({
    companyId,
    ioeId,
    correlationId,
    eventType,
    eventSource: 'aioi_learning_bridge',
    payload: { phase, ...(payload || {}) }
  });
}

module.exports = {
  VALID_EVENT_TYPES,
  persistAuditEvent,
  persistApprovalAudit,
  persistExecutionAudit,
  persistOutcomeAudit,
  persistLearningAudit
};
