'use strict';

/**
 * AIOI-P1.3 — Lifecycle Snapshot Service
 *
 * Consultas READ ONLY de snapshot e KPIs do ciclo AIOI.
 *
 * PROIBIÇÕES (A1 / A6):
 *   ✗ UPDATE / INSERT / DELETE
 *   ✗ Importar soberanos funcionais
 *   ✗ Recalcular score ou inferência
 */

const db = require('../../db');
const { isValidUUID } = require('../../utils/security');

const metrics = require('./aioiLifecycleMetrics');

const LAYER = 'AIOI_LIFECYCLE_SNAPSHOT';

// ---------------------------------------------------------------------------
// Helpers RLS (read-only)
// ---------------------------------------------------------------------------

async function _withTenantReadClient(companyId, fn) {
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

function _assertReadOnlySql(sql) {
  const s = sql.trim().toUpperCase();
  if (s.startsWith('UPDATE') || s.startsWith('INSERT') || s.startsWith('DELETE')) {
    throw new Error(`${LAYER}: escrita proibida em P1.3`);
  }
}

async function _readQuery(client, sql, params) {
  _assertReadOnlySql(sql);
  return client.query(sql, params);
}

// ---------------------------------------------------------------------------
// getLifecycleSnapshot — A2
// ---------------------------------------------------------------------------

/**
 * Snapshot agregado do ciclo de vida por tenant.
 *
 * @param {string} companyId
 * @returns {Promise<object>}
 */
async function getLifecycleSnapshot(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  const startMs = Date.now();

  try {
    const row = await _withTenantReadClient(companyId, async (client) => {
      const result = await _readQuery(client,
        `SELECT
           COUNT(*) FILTER (WHERE status = 'open')              AS open,
           COUNT(*) FILTER (WHERE status = 'triaged')           AS triaged,
           COUNT(*) FILTER (WHERE status = 'pending_approval')  AS pending_approval,
           COUNT(*) FILTER (WHERE status = 'approved')        AS approved,
           COUNT(*) FILTER (WHERE status = 'rejected')        AS rejected,
           COUNT(*) FILTER (WHERE status = 'in_progress')     AS in_progress,
           COUNT(*) FILTER (WHERE status = 'resolved')          AS resolved,
           COUNT(*) FILTER (
             WHERE decision_payload->>'aioi_learning_submitted' = 'true'
           ) AS learning_submitted,
           COUNT(*) FILTER (
             WHERE decision_payload->>'aioi_learning_processed' = 'true'
           ) AS learning_processed
         FROM industrial_operational_events
         WHERE company_id = $1::uuid`,
        [companyId]
      );
      return result.rows[0] || {};
    });

    const snapshot = {
      open:               parseInt(row.open || '0', 10),
      triaged:            parseInt(row.triaged || '0', 10),
      pending_approval:   parseInt(row.pending_approval || '0', 10),
      approved:           parseInt(row.approved || '0', 10),
      rejected:           parseInt(row.rejected || '0', 10),
      in_progress:        parseInt(row.in_progress || '0', 10),
      resolved:           parseInt(row.resolved || '0', 10),
      learning_submitted: parseInt(row.learning_submitted || '0', 10),
      learning_processed: parseInt(row.learning_processed || '0', 10)
    };

    const latencyMs = Date.now() - startMs;
    metrics.recordSnapshot(companyId, snapshot, latencyMs);

    return { ok: true, snapshot };

  } catch (err) {
    metrics.recordError(companyId, 'getLifecycleSnapshot', err.message);
    return { ok: false, error: err.message };
  }
}

// ---------------------------------------------------------------------------
// getCycleKpis — KPIs obrigatórios (read-only)
// ---------------------------------------------------------------------------

/**
 * KPIs de tempo do ciclo (médias em ms a partir de timestamps existentes).
 *
 * @param {string} companyId
 * @returns {Promise<object>}
 */
async function getCycleKpis(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  const startMs = Date.now();

  try {
    const row = await _withTenantReadClient(companyId, async (client) => {
      const result = await _readQuery(client,
        `SELECT
           AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) * 1000)
             FILTER (WHERE status NOT IN ('open', 'auto_closed'))
           AS avg_time_open_to_triaged,

           AVG(EXTRACT(EPOCH FROM (approved_at - created_at)) * 1000)
             FILTER (WHERE approved_at IS NOT NULL)
           AS avg_time_triaged_to_approval,

           AVG(EXTRACT(EPOCH FROM (updated_at - approved_at)) * 1000)
             FILTER (
               WHERE approved_at IS NOT NULL
                 AND (execution_trace_id IS NOT NULL OR workflow_instance_id IS NOT NULL)
                 AND status IN ('in_progress', 'resolved', 'closed', 'escalated')
             )
           AS avg_time_approval_to_execution,

           AVG(EXTRACT(EPOCH FROM (resolved_at - approved_at)) * 1000)
             FILTER (
               WHERE resolved_at IS NOT NULL
                 AND approved_at IS NOT NULL
                 AND (execution_trace_id IS NOT NULL OR workflow_instance_id IS NOT NULL)
             )
           AS avg_time_execution_to_outcome,

           AVG(
             EXTRACT(EPOCH FROM (
               (decision_payload->>'aioi_learning_submitted_at')::timestamptz - resolved_at
             )) * 1000
           ) FILTER (
             WHERE resolved_at IS NOT NULL
               AND decision_payload->>'aioi_learning_submitted' = 'true'
               AND decision_payload->>'aioi_learning_submitted_at' IS NOT NULL
           )
           AS avg_time_outcome_to_learning,

           AVG(
             EXTRACT(EPOCH FROM (
               COALESCE(
                 (decision_payload->>'aioi_learning_submitted_at')::timestamptz,
                 resolved_at
               ) - created_at
             )) * 1000
           ) FILTER (WHERE status IN ('resolved', 'closed'))
           AS end_to_end_cycle_time
         FROM industrial_operational_events
         WHERE company_id = $1::uuid`,
        [companyId]
      );
      return result.rows[0] || {};
    });

    const kpis = {
      avg_time_open_to_triaged:        _roundMs(row.avg_time_open_to_triaged),
      avg_time_triaged_to_approval:    _roundMs(row.avg_time_triaged_to_approval),
      avg_time_approval_to_execution:  _roundMs(row.avg_time_approval_to_execution),
      avg_time_execution_to_outcome:   _roundMs(row.avg_time_execution_to_outcome),
      avg_time_outcome_to_learning:    _roundMs(row.avg_time_outcome_to_learning),
      end_to_end_cycle_time:           _roundMs(row.end_to_end_cycle_time)
    };

    metrics.recordQuery(companyId, 'cycle_kpis', Date.now() - startMs);

    return { ok: true, kpis };

  } catch (err) {
    metrics.recordError(companyId, 'getCycleKpis', err.message);
    return { ok: false, error: err.message };
  }
}

function _roundMs(val) {
  if (val == null || !Number.isFinite(Number(val))) return null;
  return Math.round(Number(val));
}

module.exports = {
  getLifecycleSnapshot,
  getCycleKpis,
  _withTenantReadClient,
  _readQuery,
  _assertReadOnlySql
};
