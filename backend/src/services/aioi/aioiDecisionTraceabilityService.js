'use strict';

/**
 * AIOI-P3.1 — Decision Traceability Service (READ ONLY)
 *
 * Rastreabilidade IOE → decisão → HITL → execução → outcome → learning → intelligence → trust.
 */

const { isValidUUID } = require('../../utils/security');
const expMetrics = require('./aioiExplainabilityMetrics');

const IOE_TABLE = 'industrial_operational_events';
const HISTORY_TABLE = 'aioi_processing_history';
const SNAPSHOTS_TABLE = 'aioi_metrics_snapshots';
const AUDIT_TABLE = 'aioi_audit_events';

async function _fetchTraceabilitySignals(companyId) {
  return expMetrics.withTenantReadClient(companyId, async (client) => {
    const ioeRes = await expMetrics.readQuery(client,
      `SELECT
         COUNT(*) AS total,
         COUNT(*) FILTER (WHERE decision_type IS NOT NULL) AS with_decision,
         COUNT(*) FILTER (WHERE approved_by_user_id IS NOT NULL) AS with_hitl,
         COUNT(*) FILTER (
           WHERE workflow_instance_id IS NOT NULL OR execution_trace_id IS NOT NULL
         ) AS with_execution,
         COUNT(*) FILTER (
           WHERE decision_payload->'aioi_outcome' IS NOT NULL
         ) AS with_outcome,
         COUNT(*) FILTER (
           WHERE decision_payload->>'aioi_learning_processed' = 'true'
             OR decision_payload->>'aioi_learning_submitted' = 'true'
         ) AS with_learning
       FROM ${IOE_TABLE}
       WHERE company_id = $1::uuid`,
      [companyId]
    );

    const [hist, snaps, audit] = await Promise.all([
      expMetrics.readQuery(client,
        `SELECT COUNT(*) AS cnt FROM ${HISTORY_TABLE} WHERE company_id = $1::uuid`, [companyId]),
      expMetrics.readQuery(client,
        `SELECT COUNT(*) AS cnt FROM ${SNAPSHOTS_TABLE} WHERE company_id = $1::uuid`, [companyId]),
      expMetrics.readQuery(client,
        `SELECT COUNT(*) AS cnt FROM ${AUDIT_TABLE} WHERE company_id = $1::uuid`, [companyId])
    ]);

    const row = ioeRes.rows[0] || {};
    return {
      total:           parseInt(row.total || '0', 10),
      with_decision:   parseInt(row.with_decision || '0', 10),
      with_hitl:       parseInt(row.with_hitl || '0', 10),
      with_execution:  parseInt(row.with_execution || '0', 10),
      with_outcome:    parseInt(row.with_outcome || '0', 10),
      with_learning:   parseInt(row.with_learning || '0', 10),
      history_count:   parseInt(hist.rows[0]?.cnt || '0', 10),
      snapshot_count:  parseInt(snaps.rows[0]?.cnt || '0', 10),
      audit_count:     parseInt(audit.rows[0]?.cnt || '0', 10)
    };
  });
}

function _stageRatio(count, total) {
  if (total <= 0) return count > 0 ? 1 : 0.5;
  return Math.min(1, count / total);
}

function computeTraceabilityScore(signals) {
  if (signals.total === 0 && signals.history_count === 0) return 30;

  const stages = [
    _stageRatio(signals.with_decision, signals.total) * 15,
    _stageRatio(signals.with_hitl, signals.total) * 15,
    _stageRatio(signals.with_execution, signals.total) * 15,
    _stageRatio(signals.with_outcome, signals.total) * 15,
    _stageRatio(signals.with_learning, signals.total) * 10,
    signals.snapshot_count > 0 ? 10 : 0,
    signals.history_count > 0 ? 10 : 0,
    signals.audit_count > 0 ? 10 : 0
  ];

  return expMetrics.clampScore(stages.reduce((a, b) => a + b, 0));
}

function buildDecisionTraceability(signals) {
  const traceability_score = computeTraceabilityScore(signals);
  return {
    traceability_score,
    traceability_status: expMetrics.classifyTraceabilityStatus(traceability_score)
  };
}

async function getDecisionTraceability(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  try {
    const signals = await _fetchTraceabilitySignals(companyId);
    const decision_traceability = buildDecisionTraceability(signals);
    expMetrics.recordTraceabilityAnalyzed(companyId);
    return { ok: true, decision_traceability };

  } catch (err) {
    expMetrics.recordError(companyId, 'getDecisionTraceability', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  computeTraceabilityScore,
  buildDecisionTraceability,
  getDecisionTraceability
};
