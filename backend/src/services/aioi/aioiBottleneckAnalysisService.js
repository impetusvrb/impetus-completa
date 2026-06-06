'use strict';

/**
 * AIOI-P2.0 — Bottleneck Analysis Service (READ ONLY)
 *
 * Identificação de gargalos operacionais via consultas agregadas.
 */

const { isValidUUID } = require('../../utils/security');
const execMetrics = require('./aioiExecutiveMetrics');

const IOE_TABLE = 'industrial_operational_events';
const DEFAULT_LIMIT = 50;

function _clampLimit(limit) {
  return Math.min(Math.max(parseInt(String(limit), 10) || DEFAULT_LIMIT, 1), 200);
}

async function _countBacklog(companyId, sql, params) {
  return execMetrics.withTenantReadClient(companyId, async (client) => {
    const result = await execMetrics.readQuery(client, sql, params);
    return parseInt(result.rows[0]?.count || '0', 10);
  });
}

async function getApprovalBacklog(companyId, limit = DEFAULT_LIMIT) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido', count: 0, backlog: [] };
  }
  const lim = _clampLimit(limit);
  try {
    const rows = await execMetrics.withTenantReadClient(companyId, async (client) => {
      const result = await execMetrics.readQuery(client,
        `SELECT id, correlation_id, category, priority_band, decision_type, created_at
         FROM ${IOE_TABLE}
         WHERE company_id = $1::uuid AND status = 'pending_approval'
         ORDER BY created_at ASC LIMIT $2`,
        [companyId, lim]
      );
      return result.rows || [];
    });
    return { ok: true, count: rows.length, backlog: rows };
  } catch (err) {
    execMetrics.recordError(companyId, 'getApprovalBacklog', err.message);
    return { ok: false, error: err.message, count: 0, backlog: [] };
  }
}

async function getExecutionBacklog(companyId, limit = DEFAULT_LIMIT) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido', count: 0, backlog: [] };
  }
  const lim = _clampLimit(limit);
  try {
    const rows = await execMetrics.withTenantReadClient(companyId, async (client) => {
      const result = await execMetrics.readQuery(client,
        `SELECT id, correlation_id, category, decision_type, approved_at
         FROM ${IOE_TABLE}
         WHERE company_id = $1::uuid
           AND status = 'approved'
           AND approved_by_user_id IS NOT NULL
           AND approved_at IS NOT NULL
           AND execution_trace_id IS NULL
           AND workflow_instance_id IS NULL
         ORDER BY approved_at ASC LIMIT $2`,
        [companyId, lim]
      );
      return result.rows || [];
    });
    return { ok: true, count: rows.length, backlog: rows };
  } catch (err) {
    execMetrics.recordError(companyId, 'getExecutionBacklog', err.message);
    return { ok: false, error: err.message, count: 0, backlog: [] };
  }
}

async function getOutcomeBacklog(companyId, limit = DEFAULT_LIMIT) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido', count: 0, backlog: [] };
  }
  const lim = _clampLimit(limit);
  try {
    const rows = await execMetrics.withTenantReadClient(companyId, async (client) => {
      const result = await execMetrics.readQuery(client,
        `SELECT id, correlation_id, category, workflow_instance_id, execution_trace_id
         FROM ${IOE_TABLE}
         WHERE company_id = $1::uuid
           AND status = 'in_progress'
           AND (execution_trace_id IS NOT NULL OR workflow_instance_id IS NOT NULL)
           AND (decision_payload->>'aioi_outcome_captured' IS NULL
                OR decision_payload->>'aioi_outcome_captured' = 'false')
         ORDER BY updated_at ASC LIMIT $2`,
        [companyId, lim]
      );
      return result.rows || [];
    });
    return { ok: true, count: rows.length, backlog: rows };
  } catch (err) {
    execMetrics.recordError(companyId, 'getOutcomeBacklog', err.message);
    return { ok: false, error: err.message, count: 0, backlog: [] };
  }
}

async function getLearningBacklog(companyId, limit = DEFAULT_LIMIT) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido', count: 0, backlog: [] };
  }
  const lim = _clampLimit(limit);
  try {
    const rows = await execMetrics.withTenantReadClient(companyId, async (client) => {
      const result = await execMetrics.readQuery(client,
        `SELECT id, correlation_id, category, resolved_at
         FROM ${IOE_TABLE}
         WHERE company_id = $1::uuid
           AND status = 'resolved'
           AND decision_payload->'aioi_outcome'->'learning_context' IS NOT NULL
           AND (decision_payload->>'aioi_learning_submitted' IS NULL
                OR decision_payload->>'aioi_learning_submitted' = 'false')
         ORDER BY resolved_at ASC NULLS LAST LIMIT $2`,
        [companyId, lim]
      );
      return result.rows || [];
    });
    return { ok: true, count: rows.length, backlog: rows };
  } catch (err) {
    execMetrics.recordError(companyId, 'getLearningBacklog', err.message);
    return { ok: false, error: err.message, count: 0, backlog: [] };
  }
}

async function getBottleneckSummary(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  const startMs = Date.now();

  try {
    const counts = await execMetrics.withTenantReadClient(companyId, async (client) => {
      const result = await execMetrics.readQuery(client,
        `SELECT
           COUNT(*) FILTER (WHERE status = 'pending_approval') AS approval_backlog,
           COUNT(*) FILTER (
             WHERE status = 'approved'
               AND approved_by_user_id IS NOT NULL
               AND execution_trace_id IS NULL
               AND workflow_instance_id IS NULL
           ) AS execution_backlog,
           COUNT(*) FILTER (
             WHERE status = 'in_progress'
               AND (execution_trace_id IS NOT NULL OR workflow_instance_id IS NOT NULL)
               AND (decision_payload->>'aioi_outcome_captured' IS NULL
                    OR decision_payload->>'aioi_outcome_captured' = 'false')
           ) AS outcome_backlog,
           COUNT(*) FILTER (
             WHERE status = 'resolved'
               AND decision_payload->'aioi_outcome'->'learning_context' IS NOT NULL
               AND (decision_payload->>'aioi_learning_submitted' IS NULL
                    OR decision_payload->>'aioi_learning_submitted' = 'false')
           ) AS learning_backlog
         FROM ${IOE_TABLE}
         WHERE company_id = $1::uuid`,
        [companyId]
      );
      return result.rows[0] || {};
    });

    const summary = {
      approval_backlog:  parseInt(counts.approval_backlog || '0', 10),
      execution_backlog: parseInt(counts.execution_backlog || '0', 10),
      outcome_backlog:   parseInt(counts.outcome_backlog || '0', 10),
      learning_backlog:  parseInt(counts.learning_backlog || '0', 10)
    };

    const entries = [
      { name: 'approval', count: summary.approval_backlog },
      { name: 'execution', count: summary.execution_backlog },
      { name: 'outcome', count: summary.outcome_backlog },
      { name: 'learning', count: summary.learning_backlog }
    ];
    const max = entries.reduce((a, b) => (b.count > a.count ? b : a), entries[0]);
    summary.largest_bottleneck = max.count > 0 ? max.name : null;

    execMetrics.recordBottleneckAnalysisRequested(companyId, Date.now() - startMs);
    return { ok: true, bottlenecks: summary };

  } catch (err) {
    execMetrics.recordError(companyId, 'getBottleneckSummary', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  getApprovalBacklog,
  getExecutionBacklog,
  getOutcomeBacklog,
  getLearningBacklog,
  getBottleneckSummary
};
