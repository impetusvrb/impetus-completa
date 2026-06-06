'use strict';

/**
 * AIOI-P2.0 — Executive Snapshot Service (READ ONLY)
 *
 * Visão executiva consolidada a partir de industrial_operational_events
 * e aioi_audit_events. Sem soberanos funcionais. Sem escrita.
 */

const { isValidUUID } = require('../../utils/security');
const execMetrics = require('./aioiExecutiveMetrics');

const IOE_TABLE = 'industrial_operational_events';

async function getCriticalEventsSummary(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  try {
    const row = await execMetrics.withTenantReadClient(companyId, async (client) => {
      const result = await execMetrics.readQuery(client,
        `SELECT COUNT(*) AS critical_events
         FROM ${IOE_TABLE}
         WHERE company_id = $1::uuid
           AND priority_band = 'critical'
           AND status NOT IN ('closed', 'auto_closed', 'rejected')`,
        [companyId]
      );
      return result.rows[0] || {};
    });

    return {
      ok: true,
      critical_events: parseInt(row.critical_events || '0', 10)
    };
  } catch (err) {
    execMetrics.recordError(companyId, 'getCriticalEventsSummary', err.message);
    return { ok: false, error: err.message };
  }
}

async function getOperationalSuccessRate(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  try {
    const row = await execMetrics.withTenantReadClient(companyId, async (client) => {
      const result = await execMetrics.readQuery(client,
        `SELECT
           COUNT(*) FILTER (
             WHERE decision_payload->'aioi_outcome'->>'outcome_status'
               IN ('success', 'partial_success')
           ) AS success_count,
           COUNT(*) FILTER (
             WHERE decision_payload->'aioi_outcome'->>'outcome_status' IS NOT NULL
           ) AS total_with_outcome
         FROM ${IOE_TABLE}
         WHERE company_id = $1::uuid`,
        [companyId]
      );
      return result.rows[0] || {};
    });

    const success = parseInt(row.success_count || '0', 10);
    const total = parseInt(row.total_with_outcome || '0', 10);
    const rate = total > 0 ? Math.round((success / total) * 10000) / 10000 : null;

    return { ok: true, operational_success_rate: rate, success_count: success, total_with_outcome: total };
  } catch (err) {
    execMetrics.recordError(companyId, 'getOperationalSuccessRate', err.message);
    return { ok: false, error: err.message };
  }
}

async function getExecutiveSnapshot(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  const startMs = Date.now();

  try {
    const row = await execMetrics.withTenantReadClient(companyId, async (client) => {
      const result = await execMetrics.readQuery(client,
        `SELECT
           COUNT(*) FILTER (WHERE status = 'open')             AS open,
           COUNT(*) FILTER (WHERE status = 'triaged')          AS triaged,
           COUNT(*) FILTER (WHERE status = 'pending_approval') AS pending_approval,
           COUNT(*) FILTER (WHERE status = 'approved')         AS approved,
           COUNT(*) FILTER (WHERE status = 'rejected')         AS rejected,
           COUNT(*) FILTER (WHERE status = 'in_progress')    AS in_progress,
           COUNT(*) FILTER (WHERE status = 'resolved')         AS resolved,
           COUNT(*) FILTER (
             WHERE priority_band = 'critical'
               AND status NOT IN ('closed', 'auto_closed', 'rejected')
           ) AS critical_events,
           AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) * 1000)
             FILTER (WHERE resolved_at IS NOT NULL)
           AS avg_resolution_time_ms,
           AVG(EXTRACT(EPOCH FROM (approved_at - created_at)) * 1000)
             FILTER (WHERE approved_at IS NOT NULL)
           AS avg_approval_time_ms,
           AVG(EXTRACT(EPOCH FROM (resolved_at - approved_at)) * 1000)
             FILTER (
               WHERE resolved_at IS NOT NULL AND approved_at IS NOT NULL
                 AND (execution_trace_id IS NOT NULL OR workflow_instance_id IS NOT NULL)
             )
           AS avg_execution_time_ms,
           COUNT(*) FILTER (
             WHERE decision_payload->'aioi_outcome'->>'outcome_status'
               IN ('success', 'partial_success')
           ) AS success_count,
           COUNT(*) FILTER (
             WHERE decision_payload->'aioi_outcome'->>'outcome_status' IS NOT NULL
           ) AS total_with_outcome
         FROM ${IOE_TABLE}
         WHERE company_id = $1::uuid`,
        [companyId]
      );
      return result.rows[0] || {};
    });

    const totalOutcome = parseInt(row.total_with_outcome || '0', 10);
    const successCount = parseInt(row.success_count || '0', 10);

    const snapshot = {
      open:               parseInt(row.open || '0', 10),
      triaged:            parseInt(row.triaged || '0', 10),
      pending_approval:   parseInt(row.pending_approval || '0', 10),
      approved:           parseInt(row.approved || '0', 10),
      rejected:           parseInt(row.rejected || '0', 10),
      in_progress:        parseInt(row.in_progress || '0', 10),
      resolved:           parseInt(row.resolved || '0', 10),
      critical_events:    parseInt(row.critical_events || '0', 10),
      avg_resolution_time_ms: execMetrics.roundMs(row.avg_resolution_time_ms),
      avg_approval_time_ms:   execMetrics.roundMs(row.avg_approval_time_ms),
      avg_execution_time_ms:  execMetrics.roundMs(row.avg_execution_time_ms),
      operational_success_rate: totalOutcome > 0
        ? Math.round((successCount / totalOutcome) * 10000) / 10000
        : null
    };

    execMetrics.recordSnapshotRequested(companyId, Date.now() - startMs);
    return { ok: true, snapshot };

  } catch (err) {
    execMetrics.recordError(companyId, 'getExecutiveSnapshot', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  getExecutiveSnapshot,
  getCriticalEventsSummary,
  getOperationalSuccessRate
};
