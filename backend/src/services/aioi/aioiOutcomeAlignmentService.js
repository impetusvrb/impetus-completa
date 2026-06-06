'use strict';

/**
 * AIOI-P3.4 — Outcome Alignment Service (READ ONLY)
 *
 * Alinhamento Intelligence → Decision → Execution → Outcome via fontes permitidas.
 */

const { isValidUUID } = require('../../utils/security');
const vgMetrics = require('./aioiValueGovernanceMetrics');

const IOE_TABLE = 'industrial_operational_events';
const HISTORY_TABLE = 'aioi_processing_history';
const SNAPSHOTS_TABLE = 'aioi_metrics_snapshots';
const AUDIT_TABLE = 'aioi_audit_events';

const ALIGNMENT_STAGES = Object.freeze([
  'intelligence', 'decision', 'execution', 'outcome'
]);

async function _fetchAlignmentSignals(companyId) {
  return vgMetrics.withTenantReadClient(companyId, async (client) => {
    const ioeRes = await vgMetrics.readQuery(client,
      `SELECT
         COUNT(*) AS total,
         COUNT(*) FILTER (WHERE decision_type IS NOT NULL) AS with_decision,
         COUNT(*) FILTER (
           WHERE workflow_instance_id IS NOT NULL OR execution_trace_id IS NOT NULL
         ) AS with_execution,
         COUNT(*) FILTER (
           WHERE decision_payload->'aioi_outcome' IS NOT NULL
         ) AS with_outcome
       FROM ${IOE_TABLE}
       WHERE company_id = $1::uuid`,
      [companyId]
    );

    const [hist, snaps, audit] = await Promise.all([
      vgMetrics.readQuery(client,
        `SELECT COUNT(*) AS cnt FROM ${HISTORY_TABLE} WHERE company_id = $1::uuid`, [companyId]),
      vgMetrics.readQuery(client,
        `SELECT COUNT(*) AS cnt FROM ${SNAPSHOTS_TABLE} WHERE company_id = $1::uuid`, [companyId]),
      vgMetrics.readQuery(client,
        `SELECT COUNT(*) AS cnt FROM ${AUDIT_TABLE} WHERE company_id = $1::uuid`, [companyId])
    ]);

    const row = ioeRes.rows[0] || {};
    const historyCount = parseInt(hist.rows[0]?.cnt || '0', 10);
    const snapshotCount = parseInt(snaps.rows[0]?.cnt || '0', 10);
    const auditCount = parseInt(audit.rows[0]?.cnt || '0', 10);

    return {
      total:          parseInt(row.total || '0', 10),
      with_decision:  parseInt(row.with_decision || '0', 10),
      with_execution: parseInt(row.with_execution || '0', 10),
      with_outcome:   parseInt(row.with_outcome || '0', 10),
      history_count:  historyCount,
      snapshot_count: snapshotCount,
      audit_count:    auditCount,
      intelligence:   snapshotCount > 0 && historyCount > 0 && auditCount > 0 ? 1 : 0
    };
  });
}

function _stageRatio(count, total) {
  if (total <= 0) return count > 0 ? 1 : 0;
  return Math.min(1, count / total);
}

function computeAlignmentScore(signals) {
  if (signals.total === 0 && signals.intelligence === 0) return 25;

  const stages = [
    signals.intelligence ? 25 : 0,
    _stageRatio(signals.with_decision, signals.total) * 25,
    Math.max(
      _stageRatio(signals.with_execution, signals.total),
      signals.history_count > 0 ? 0.8 : 0
    ) * 25,
    _stageRatio(signals.with_outcome, signals.total) * 25
  ];

  return vgMetrics.clampScore(stages.reduce((a, b) => a + b, 0));
}

function buildOutcomeAlignment(signals) {
  const alignment_score = computeAlignmentScore(signals);
  return {
    alignment_score,
    alignment_status: vgMetrics.classifyAlignmentStatus(alignment_score)
  };
}

async function getOutcomeAlignment(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  try {
    const signals = await _fetchAlignmentSignals(companyId);
    const outcome_alignment = buildOutcomeAlignment(signals);
    vgMetrics.recordOutcomeAlignmentAnalyzed(companyId);
    return { ok: true, outcome_alignment };

  } catch (err) {
    vgMetrics.recordError(companyId, 'getOutcomeAlignment', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  ALIGNMENT_STAGES,
  computeAlignmentScore,
  buildOutcomeAlignment,
  getOutcomeAlignment
};
