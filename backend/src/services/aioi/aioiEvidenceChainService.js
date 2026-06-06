'use strict';

/**
 * AIOI-P3.2 — Evidence Chain Service (READ ONLY)
 *
 * Cadeia IOE → Decision → Approval → Execution → Outcome → Learning
 * → Intelligence → Trust → Assurance.
 */

const { isValidUUID } = require('../../utils/security');
const auditMetrics = require('./aioiAuditabilityMetrics');

const IOE_TABLE = 'industrial_operational_events';
const HISTORY_TABLE = 'aioi_processing_history';
const SNAPSHOTS_TABLE = 'aioi_metrics_snapshots';
const AUDIT_TABLE = 'aioi_audit_events';

const CHAIN_STAGES = Object.freeze([
  'ioe', 'decision', 'approval', 'execution', 'outcome',
  'learning', 'intelligence', 'trust', 'assurance'
]);

async function _fetchChainSignals(companyId) {
  return auditMetrics.withTenantReadClient(companyId, async (client) => {
    const ioeRes = await auditMetrics.readQuery(client,
      `SELECT
         COUNT(*) AS total,
         COUNT(*) FILTER (WHERE decision_type IS NOT NULL) AS with_decision,
         COUNT(*) FILTER (WHERE approved_by_user_id IS NOT NULL) AS with_approval,
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
      auditMetrics.readQuery(client,
        `SELECT COUNT(*) AS cnt FROM ${HISTORY_TABLE} WHERE company_id = $1::uuid`, [companyId]),
      auditMetrics.readQuery(client,
        `SELECT COUNT(*) AS cnt FROM ${SNAPSHOTS_TABLE} WHERE company_id = $1::uuid`, [companyId]),
      auditMetrics.readQuery(client,
        `SELECT COUNT(*) AS cnt FROM ${AUDIT_TABLE} WHERE company_id = $1::uuid`, [companyId])
    ]);

    const row = ioeRes.rows[0] || {};
    const snapshotCount = parseInt(snaps.rows[0]?.cnt || '0', 10);
    const historyCount = parseInt(hist.rows[0]?.cnt || '0', 10);
    const auditCount = parseInt(audit.rows[0]?.cnt || '0', 10);

    return {
      total:           parseInt(row.total || '0', 10),
      with_decision:   parseInt(row.with_decision || '0', 10),
      with_approval:   parseInt(row.with_approval || '0', 10),
      with_execution:  parseInt(row.with_execution || '0', 10),
      with_outcome:    parseInt(row.with_outcome || '0', 10),
      with_learning:   parseInt(row.with_learning || '0', 10),
      intelligence:    snapshotCount > 0 && historyCount > 0 ? 1 : 0,
      trust:           auditCount > 0 && snapshotCount > 0 ? 1 : 0,
      assurance:       historyCount > 0 && auditCount > 0 ? 1 : 0
    };
  });
}

function _stageRatio(count, total) {
  if (total <= 0) return count > 0 ? 1 : 0;
  return Math.min(1, count / total);
}

function computeChainScore(signals) {
  if (signals.total === 0 && signals.intelligence === 0) return 25;

  const stages = [
    signals.total > 0 ? 12 : 0,
    _stageRatio(signals.with_decision, signals.total) * 11,
    _stageRatio(signals.with_approval, signals.total) * 11,
    _stageRatio(signals.with_execution, signals.total) * 11,
    _stageRatio(signals.with_outcome, signals.total) * 11,
    _stageRatio(signals.with_learning, signals.total) * 11,
    signals.intelligence ? 11 : 0,
    signals.trust ? 11 : 0,
    signals.assurance ? 11 : 0
  ];

  return auditMetrics.clampScore(stages.reduce((a, b) => a + b, 0));
}

function buildEvidenceChain(signals) {
  const chain_score = computeChainScore(signals);
  return {
    chain_score,
    chain_status: auditMetrics.classifyChainStatus(chain_score)
  };
}

async function getEvidenceChain(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  try {
    const signals = await _fetchChainSignals(companyId);
    const evidence_chain = buildEvidenceChain(signals);
    auditMetrics.recordEvidenceChainAnalyzed(companyId);
    return { ok: true, evidence_chain };

  } catch (err) {
    auditMetrics.recordError(companyId, 'getEvidenceChain', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  CHAIN_STAGES,
  computeChainScore,
  buildEvidenceChain,
  getEvidenceChain
};
