'use strict';

/**
 * AIOI-P2.0 — Cycle Analytics Service (READ ONLY)
 *
 * Analytics de tempo do ciclo operacional — agregação pura, sem inferência.
 */

const { isValidUUID } = require('../../utils/security');
const execMetrics = require('./aioiExecutiveMetrics');

const IOE_TABLE = 'industrial_operational_events';

const CYCLE_KPI_SQL = `
  SELECT
    AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) * 1000)
      FILTER (WHERE status NOT IN ('open', 'auto_closed'))
    AS open_to_triaged_ms,

    AVG(EXTRACT(EPOCH FROM (approved_at - created_at)) * 1000)
      FILTER (WHERE approved_at IS NOT NULL)
    AS triaged_to_approval_ms,

    AVG(EXTRACT(EPOCH FROM (updated_at - approved_at)) * 1000)
      FILTER (
        WHERE approved_at IS NOT NULL
          AND (execution_trace_id IS NOT NULL OR workflow_instance_id IS NOT NULL)
          AND status IN ('in_progress', 'resolved', 'closed', 'escalated')
      )
    AS approval_to_execution_ms,

    AVG(EXTRACT(EPOCH FROM (resolved_at - approved_at)) * 1000)
      FILTER (
        WHERE resolved_at IS NOT NULL AND approved_at IS NOT NULL
          AND (execution_trace_id IS NOT NULL OR workflow_instance_id IS NOT NULL)
      )
    AS execution_to_outcome_ms,

    AVG(
      EXTRACT(EPOCH FROM (
        (decision_payload->>'aioi_learning_submitted_at')::timestamptz - resolved_at
      )) * 1000
    ) FILTER (
      WHERE resolved_at IS NOT NULL
        AND decision_payload->>'aioi_learning_submitted' = 'true'
        AND decision_payload->>'aioi_learning_submitted_at' IS NOT NULL
    )
    AS outcome_to_learning_ms,

    AVG(
      EXTRACT(EPOCH FROM (
        COALESCE(
          (decision_payload->>'aioi_learning_submitted_at')::timestamptz,
          resolved_at
        ) - created_at
      )) * 1000
    ) FILTER (WHERE status IN ('resolved', 'closed'))
    AS end_to_end_cycle_ms
  FROM ${IOE_TABLE}
  WHERE company_id = $1::uuid
`;

function _mapCycleRow(row) {
  return {
    open_to_triaged_ms:       execMetrics.roundMs(row.open_to_triaged_ms),
    triaged_to_approval_ms:   execMetrics.roundMs(row.triaged_to_approval_ms),
    approval_to_execution_ms: execMetrics.roundMs(row.approval_to_execution_ms),
    execution_to_outcome_ms:  execMetrics.roundMs(row.execution_to_outcome_ms),
    outcome_to_learning_ms:   execMetrics.roundMs(row.outcome_to_learning_ms),
    end_to_end_cycle_ms:      execMetrics.roundMs(row.end_to_end_cycle_ms)
  };
}

async function getCycleKpis(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  const startMs = Date.now();

  try {
    const row = await execMetrics.withTenantReadClient(companyId, async (client) => {
      const result = await execMetrics.readQuery(client, CYCLE_KPI_SQL, [companyId]);
      return result.rows[0] || {};
    });

    const kpis = _mapCycleRow(row);
    execMetrics.recordCycleAnalyticsRequested(companyId, Date.now() - startMs);
    return { ok: true, kpis };

  } catch (err) {
    execMetrics.recordError(companyId, 'getCycleKpis', err.message);
    return { ok: false, error: err.message };
  }
}

async function getLifecycleAnalytics(companyId) {
  const result = await getCycleKpis(companyId);
  if (!result.ok) return result;
  return { ok: true, analytics: result.kpis };
}

module.exports = {
  getLifecycleAnalytics,
  getCycleKpis
};
