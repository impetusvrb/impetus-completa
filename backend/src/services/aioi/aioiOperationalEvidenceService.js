'use strict';

/**
 * AIOI-P3.1 — Operational Evidence Service
 *
 * Coleta formal de evidências operacionais do piloto.
 * Somente leitura + registo de snapshots — zero mutação de filas/classificação/decisões.
 */

const db = require('../../db');
const pilotFlags = require('./aioiPilotFlags');
const operationalMetrics = require('./aioiOperationalMetricsService');
const operationalTelemetry = require('./aioiOperationalTelemetryService');

const LAYER = 'AIOI_OPERATIONAL_EVIDENCE';
const MAX_SNAPSHOTS = 100;

const _snapshots = [];

async function _queryPipelineCounts(tenantIds) {
  if (!tenantIds.length) {
    return {
      ioe_total: 0,
      ioe_open: 0,
      ioe_triaged: 0,
      ioe_with_decision: 0,
      ioe_executing: 0,
      ioe_resolved: 0,
      ioe_with_outcome: 0,
      ioe_with_learning: 0
    };
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`SELECT set_config('app.bypass_rls', 'true', true)`);

    const result = await client.query(
      `SELECT
         COUNT(*) AS ioe_total,
         COUNT(*) FILTER (WHERE status = 'open') AS ioe_open,
         COUNT(*) FILTER (WHERE status = 'triaged') AS ioe_triaged,
         COUNT(*) FILTER (WHERE decision_type IS NOT NULL) AS ioe_with_decision,
         COUNT(*) FILTER (WHERE status = 'in_progress') AS ioe_executing,
         COUNT(*) FILTER (WHERE status = 'resolved') AS ioe_resolved,
         COUNT(*) FILTER (WHERE decision_payload->'aioi_outcome' IS NOT NULL) AS ioe_with_outcome,
         COUNT(*) FILTER (WHERE decision_payload->>'aioi_learning_submitted' = 'true') AS ioe_with_learning
       FROM industrial_operational_events
       WHERE company_id = ANY($1::uuid[])`,
      [tenantIds]
    );

    await client.query('COMMIT');
    const row = result.rows[0] || {};
    return {
      ioe_total:           parseInt(row.ioe_total || '0', 10),
      ioe_open:            parseInt(row.ioe_open || '0', 10),
      ioe_triaged:         parseInt(row.ioe_triaged || '0', 10),
      ioe_with_decision:   parseInt(row.ioe_with_decision || '0', 10),
      ioe_executing:       parseInt(row.ioe_executing || '0', 10),
      ioe_resolved:        parseInt(row.ioe_resolved || '0', 10),
      ioe_with_outcome:    parseInt(row.ioe_with_outcome || '0', 10),
      ioe_with_learning:   parseInt(row.ioe_with_learning || '0', 10)
    };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error(`[${LAYER}] Erro pipeline counts`, { error: err.message });
    return {
      ioe_total: 0, ioe_open: 0, ioe_triaged: 0, ioe_with_decision: 0,
      ioe_executing: 0, ioe_resolved: 0, ioe_with_outcome: 0, ioe_with_learning: 0
    };
  } finally {
    client.release();
  }
}

async function _queryLatencyMetrics(tenantIds) {
  if (!tenantIds.length) {
    return { avg_outbox_latency_ms: null, avg_ioe_age_hours: null };
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`SELECT set_config('app.bypass_rls', 'true', true)`);

    const outboxResult = await client.query(
      `SELECT ROUND(AVG(
         EXTRACT(EPOCH FROM (processed_at - created_at)) * 1000
       ) FILTER (WHERE processed_at IS NOT NULL)) AS avg_outbox_latency_ms
       FROM aioi_outbox
       WHERE company_id = ANY($1::uuid[])
         AND consumer_type = 'classification'`,
      [tenantIds]
    );

    const ioeResult = await client.query(
      `SELECT ROUND(AVG(
         EXTRACT(EPOCH FROM (now() - created_at)) / 3600
       )::numeric, 2) AS avg_ioe_age_hours
       FROM industrial_operational_events
       WHERE company_id = ANY($1::uuid[])
         AND status NOT IN ('resolved', 'closed', 'rejected')`,
      [tenantIds]
    );

    await client.query('COMMIT');

    return {
      avg_outbox_latency_ms: outboxResult.rows[0]?.avg_outbox_latency_ms != null
        ? Number(outboxResult.rows[0].avg_outbox_latency_ms)
        : null,
      avg_ioe_age_hours: ioeResult.rows[0]?.avg_ioe_age_hours != null
        ? Number(ioeResult.rows[0].avg_ioe_age_hours)
        : null
    };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    return { avg_outbox_latency_ms: null, avg_ioe_age_hours: null };
  } finally {
    client.release();
  }
}

/**
 * Coleta evidências operacionais completas do piloto.
 * @returns {Promise<object>}
 */
async function collectOperationalEvidence() {
  const tenants = pilotFlags.getPilotTenants();
  const flags = pilotFlags.getAioiFlags();

  const [metrics, pipeline, latency] = await Promise.all([
    operationalMetrics.getOperationalMetrics(),
    _queryPipelineCounts(tenants),
    _queryLatencyMetrics(tenants)
  ]);

  const outboxTotal = metrics.outbox_pending + metrics.outbox_processing
    + metrics.outbox_delivered + metrics.outbox_failed;
  const errorRate = outboxTotal > 0
    ? Math.round((metrics.outbox_failed / outboxTotal) * 10000) / 100
    : 0;
  const dlqUtilization = outboxTotal > 0
    ? Math.round((metrics.dlq_count / outboxTotal) * 10000) / 100
    : 0;
  const throughput = {
    classification_rate: metrics.classification_rate,
    decision_rate:       metrics.decision_rate,
    execution_rate:      metrics.execution_rate,
    learning_rate:       metrics.learning_rate,
    outbox_delivered:    metrics.outbox_delivered
  };

  const evidence = {
    layer:               LAYER,
    pilot_tenant_count:  tenants.length,
    flags,
    pipeline,
    throughput,
    latency: {
      avg_outbox_latency_ms: latency.avg_outbox_latency_ms,
      avg_ioe_age_hours:     latency.avg_ioe_age_hours,
      consumer_avg_ms:       metrics.session?.consumer?.avg_processing_time_ms ?? null
    },
    sla_compliance: {
      breached: metrics.sla_breached,
      at_risk:  metrics.sla_at_risk
    },
    error_rate_pct:      errorRate,
    dlq_utilization_pct: dlqUtilization,
    outbox: {
      pending:    metrics.outbox_pending,
      processing: metrics.outbox_processing,
      delivered:  metrics.outbox_delivered,
      failed:     metrics.outbox_failed,
      dlq_count:  metrics.dlq_count
    },
    worker_status: metrics.worker_status,
    captured_at:   new Date().toISOString()
  };

  operationalTelemetry.emit('operational_evidence_collected', {
    pilot_tenant_count: tenants.length,
    error_rate_pct: errorRate
  });

  return evidence;
}

/**
 * Regista snapshot operacional (ring buffer).
 * @returns {Promise<object>}
 */
async function registerOperationalSnapshot() {
  const snapshot = await collectOperationalEvidence();
  _snapshots.push(snapshot);
  if (_snapshots.length > MAX_SNAPSHOTS) {
    _snapshots.shift();
  }
  return snapshot;
}

function getRecentSnapshots(limit = 20) {
  const lim = Math.min(Math.max(parseInt(String(limit), 10) || 20, 1), MAX_SNAPSHOTS);
  return _snapshots.slice(-lim);
}

function resetSnapshots() {
  _snapshots.length = 0;
}

module.exports = {
  collectOperationalEvidence,
  registerOperationalSnapshot,
  getRecentSnapshots,
  resetSnapshots,
  LAYER
};
