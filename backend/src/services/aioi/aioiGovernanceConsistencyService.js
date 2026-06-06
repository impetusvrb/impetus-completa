'use strict';

/**
 * AIOI-P2.3 — Governance Consistency Service (READ ONLY)
 *
 * Mede aderência do ciclo approved → executed → resolved → learning_processed.
 */

const { isValidUUID } = require('../../utils/security');
const matMetrics = require('./aioiMaturityMetrics');

const IOE_TABLE = 'industrial_operational_events';
const HISTORY_TABLE = 'aioi_processing_history';

const CONSISTENCY_SQL = `
  SELECT
    COUNT(*) FILTER (
      WHERE approved_at IS NOT NULL
        AND status IN ('approved', 'in_progress', 'resolved', 'closed')
    ) AS approved,

    COUNT(*) FILTER (
      WHERE (workflow_instance_id IS NOT NULL OR execution_trace_id IS NOT NULL)
        AND status IN ('in_progress', 'resolved', 'closed', 'escalated')
    ) AS executed,

    COUNT(*) FILTER (
      WHERE status IN ('resolved', 'closed')
    ) AS resolved,

    COUNT(*) FILTER (
      WHERE status IN ('resolved', 'closed')
        AND decision_payload->>'aioi_learning_processed' = 'true'
    ) AS learning_processed_ioe
  FROM ${IOE_TABLE}
  WHERE company_id = $1::uuid
`;

function computeConsistencyScore({ approved, executed, resolved, learning_processed }) {
  const a = Math.max(0, approved);
  const e = Math.max(0, executed);
  const r = Math.max(0, resolved);
  const l = Math.max(0, learning_processed);

  if (a === 0 && e === 0 && r === 0 && l === 0) return 50;

  const ratios = [];
  if (a > 0) ratios.push(Math.min(1, e / a));
  if (e > 0) ratios.push(Math.min(1, r / e));
  if (r > 0) ratios.push(Math.min(1, l / r));

  if (!ratios.length) return 50;
  const avg = ratios.reduce((s, v) => s + v, 0) / ratios.length;
  return matMetrics.clampScore(avg * 100);
}

function classifyConsistencyStatus(score) {
  if (score >= 80) return 'consistent';
  if (score >= 50) return 'attention';
  return 'inconsistent';
}

async function _fetchLearningProcessedCount(companyId) {
  return matMetrics.withTenantReadClient(companyId, async (client) => {
    const result = await matMetrics.readQuery(client,
      `SELECT COUNT(*) AS cnt
       FROM ${HISTORY_TABLE}
       WHERE company_id = $1::uuid AND status_to = 'learning_processed'`,
      [companyId]
    );
    return parseInt(result.rows[0]?.cnt || '0', 10);
  });
}

async function getGovernanceConsistency(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  try {
    const [row, historyLearning] = await Promise.all([
      matMetrics.withTenantReadClient(companyId, async (client) => {
        const result = await matMetrics.readQuery(client, CONSISTENCY_SQL, [companyId]);
        return result.rows[0] || {};
      }),
      _fetchLearningProcessedCount(companyId)
    ]);

    const ioeLearning = parseInt(row.learning_processed_ioe || '0', 10);
    const learning_processed = Math.max(ioeLearning, historyLearning);

    const counts = {
      approved:          parseInt(row.approved || '0', 10),
      executed:          parseInt(row.executed || '0', 10),
      resolved:          parseInt(row.resolved || '0', 10),
      learning_processed
    };

    const score = computeConsistencyScore(counts);
    const governance_consistency = {
      score,
      status: classifyConsistencyStatus(score),
      counts
    };

    matMetrics.recordConsistencyAnalyzed(companyId);
    return { ok: true, governance_consistency };

  } catch (err) {
    matMetrics.recordError(companyId, 'getGovernanceConsistency', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  computeConsistencyScore,
  classifyConsistencyStatus,
  getGovernanceConsistency
};
