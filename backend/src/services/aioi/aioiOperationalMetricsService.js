'use strict';

/**
 * AIOI-P2.3 — Operational Metrics Service
 *
 * Agregação de métricas operacionais AIOI (somente leitura + contadores de sessão).
 * Sem F47 rebuild. Sem LLM.
 */

const db = require('../../db');
const pilotFlags = require('./aioiPilotFlags');
const consumerMetrics = require('./aioiConsumerMetrics');
const executionMetrics = require('./aioiExecutionMetrics');
const decisionMetrics = require('./aioiDecisionMetrics');
const learningMetrics = require('./aioiLearningMetrics');
const operationalTelemetry = require('./aioiOperationalTelemetryService');

const LAYER = 'AIOI_OPERATIONAL_METRICS';

let _sessionRates = {
  classification_batches: 0,
  classification_processed: 0,
  decision_batches: 0,
  execution_batches: 0,
  learning_batches: 0
};

function recordClassificationBatch({ companyId, processed, failed }) {
  _sessionRates.classification_batches++;
  _sessionRates.classification_processed += processed || 0;
  operationalTelemetry.emitMetricsEvent('classification_batch_recorded', {
    company_id: companyId,
    processed,
    failed
  });
}

function recordDecisionBatch() {
  _sessionRates.decision_batches++;
}

function recordExecutionBatch() {
  _sessionRates.execution_batches++;
}

function recordLearningBatch() {
  _sessionRates.learning_batches++;
}

async function _queryOutboxCountsForTenants(tenantIds) {
  if (!tenantIds.length) {
    return {
      outbox_pending: 0,
      outbox_processing: 0,
      outbox_delivered: 0,
      outbox_failed: 0,
      dlq_count: 0
    };
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`SELECT set_config('app.bypass_rls', 'true', true)`);

    const result = await client.query(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'pending')    AS outbox_pending,
         COUNT(*) FILTER (WHERE status = 'processing') AS outbox_processing,
         COUNT(*) FILTER (WHERE status = 'delivered')  AS outbox_delivered,
         COUNT(*) FILTER (WHERE status = 'failed')     AS outbox_failed
       FROM aioi_outbox
       WHERE company_id = ANY($1::uuid[])
         AND consumer_type = 'classification'`,
      [tenantIds]
    );

    await client.query('COMMIT');

    const row = result.rows[0] || {};
    const failed = parseInt(row.outbox_failed || '0', 10);

    return {
      outbox_pending:    parseInt(row.outbox_pending    || '0', 10),
      outbox_processing: parseInt(row.outbox_processing || '0', 10),
      outbox_delivered:  parseInt(row.outbox_delivered  || '0', 10),
      outbox_failed:     failed,
      dlq_count:         failed
    };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error(`[${LAYER}] Erro ao agregar outbox`, { error: err.message });
    return {
      outbox_pending: 0,
      outbox_processing: 0,
      outbox_delivered: 0,
      outbox_failed: 0,
      dlq_count: 0
    };
  } finally {
    client.release();
  }
}

async function _querySlaCountsForTenants(tenantIds) {
  if (!tenantIds.length) {
    return { sla_breached: 0, sla_at_risk: 0 };
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`SELECT set_config('app.bypass_rls', 'true', true)`);

    const result = await client.query(
      `SELECT
         COUNT(*) FILTER (WHERE breach_state = 'breached') AS sla_breached,
         COUNT(*) FILTER (WHERE breach_state = 'at_risk') AS sla_at_risk
       FROM industrial_operational_events
       WHERE company_id = ANY($1::uuid[])
         AND status NOT IN ('resolved', 'closed', 'rejected')`,
      [tenantIds]
    );

    await client.query('COMMIT');

    const row = result.rows[0] || {};
    return {
      sla_breached: parseInt(row.sla_breached || '0', 10),
      sla_at_risk:  parseInt(row.sla_at_risk  || '0', 10)
    };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    return { sla_breached: 0, sla_at_risk: 0 };
  } finally {
    client.release();
  }
}

/**
 * Snapshot agregado de métricas operacionais (pilot tenants).
 * @returns {Promise<object>}
 */
async function getOperationalMetrics() {
  const flags = pilotFlags.getAioiFlags();
  const tenants = pilotFlags.getPilotTenants();
  const outboxWorker = require('./aioiOutboxWorkerService');
  const workerStatus = outboxWorker.getWorkerStatus();

  const [outbox, sla] = await Promise.all([
    _queryOutboxCountsForTenants(tenants),
    _querySlaCountsForTenants(tenants)
  ]);

  const consumerSession = consumerMetrics.getSessionCounters();
  const executionSession = executionMetrics.getSessionCounters();
  const decisionSession = decisionMetrics.getSessionCounters?.() || {};
  const learningSession = learningMetrics.getSessionCounters?.() || {};

  const totalProcessed = _sessionRates.classification_processed;
  const classificationRate = _sessionRates.classification_batches > 0
    ? Math.round(totalProcessed / _sessionRates.classification_batches)
    : 0;

  return {
    worker_status: workerStatus,
    outbox_pending:    outbox.outbox_pending,
    outbox_processing: outbox.outbox_processing,
    outbox_delivered:  outbox.outbox_delivered,
    outbox_failed:     outbox.outbox_failed,
    dlq_count:         outbox.dlq_count,
    classification_rate: classificationRate,
    decision_rate:     decisionSession.generated_decisions || _sessionRates.decision_batches,
    execution_rate:    executionSession.execution_delegated_count || _sessionRates.execution_batches,
    learning_rate:     learningSession.learning_submitted_count || _sessionRates.learning_batches,
    sla_breached:      sla.sla_breached,
    sla_at_risk:         sla.sla_at_risk,
    flags: {
      aioi_enabled: flags.IMPETUS_AIOI_ENABLED,
      queue_active: flags.IMPETUS_AIOI_QUEUE_ACTIVE,
      worker_enabled: flags.IMPETUS_AIOI_OUTBOX_WORKER_ENABLED
    },
    pilot_tenant_count: tenants.length,
    session: {
      ..._sessionRates,
      consumer: consumerSession
    },
    captured_at: new Date().toISOString()
  };
}

function resetSessionRates() {
  _sessionRates = {
    classification_batches: 0,
    classification_processed: 0,
    decision_batches: 0,
    execution_batches: 0,
    learning_batches: 0
  };
  consumerMetrics.resetSessionCounters?.();
}

module.exports = {
  getOperationalMetrics,
  recordClassificationBatch,
  recordDecisionBatch,
  recordExecutionBatch,
  recordLearningBatch,
  resetSessionRates
};
