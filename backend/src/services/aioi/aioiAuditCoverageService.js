'use strict';

/**
 * AIOI-P3.2 — Audit Coverage Service (READ ONLY)
 *
 * Cobertura de audit trail: events, decisions, HITL, execution, outcomes,
 * learning, snapshots, trust, assurance.
 */

const { isValidUUID } = require('../../utils/security');
const auditMetrics = require('./aioiAuditabilityMetrics');

const IOE_TABLE = 'industrial_operational_events';
const HISTORY_TABLE = 'aioi_processing_history';
const SNAPSHOTS_TABLE = 'aioi_metrics_snapshots';
const AUDIT_TABLE = 'aioi_audit_events';

const COVERAGE_ELEMENTS = Object.freeze([
  'events', 'decisions', 'hitl', 'execution',
  'outcomes', 'learning', 'snapshots', 'trust', 'assurance'
]);

async function _fetchCoverageSignals(companyId) {
  return auditMetrics.withTenantReadClient(companyId, async (client) => {
    const ioeRes = await auditMetrics.readQuery(client,
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

    const [hist, snaps, auditTrust, auditAssurance] = await Promise.all([
      auditMetrics.readQuery(client,
        `SELECT COUNT(*) AS cnt FROM ${HISTORY_TABLE} WHERE company_id = $1::uuid`, [companyId]),
      auditMetrics.readQuery(client,
        `SELECT COUNT(*) AS cnt FROM ${SNAPSHOTS_TABLE} WHERE company_id = $1::uuid`, [companyId]),
      auditMetrics.readQuery(client,
        `SELECT COUNT(*) AS cnt FROM ${AUDIT_TABLE}
         WHERE company_id = $1::uuid
           AND (event_type ILIKE '%trust%' OR event_type ILIKE '%integrity%')`, [companyId]),
      auditMetrics.readQuery(client,
        `SELECT COUNT(*) AS cnt FROM ${AUDIT_TABLE}
         WHERE company_id = $1::uuid
           AND (event_type ILIKE '%assurance%' OR event_type ILIKE '%compliance%')`, [companyId])
    ]);

    const row = ioeRes.rows[0] || {};
    return {
      events:          parseInt(row.total || '0', 10),
      decisions:       parseInt(row.with_decision || '0', 10),
      hitl:            parseInt(row.with_hitl || '0', 10),
      execution:       parseInt(row.with_execution || '0', 10),
      outcomes:        parseInt(row.with_outcome || '0', 10),
      learning:        parseInt(row.with_learning || '0', 10),
      snapshots:       parseInt(snaps.rows[0]?.cnt || '0', 10),
      trust:           parseInt(auditTrust.rows[0]?.cnt || '0', 10),
      assurance:       parseInt(auditAssurance.rows[0]?.cnt || '0', 10),
      history_count:   parseInt(hist.rows[0]?.cnt || '0', 10)
    };
  });
}

function _elementCovered(key, signals) {
  switch (key) {
    case 'events':    return signals.events > 0;
    case 'decisions': return signals.decisions > 0;
    case 'hitl':      return signals.hitl > 0;
    case 'execution': return signals.execution > 0;
    case 'outcomes':  return signals.outcomes > 0;
    case 'learning':  return signals.learning > 0;
    case 'snapshots': return signals.snapshots > 0;
    case 'trust':     return signals.trust > 0 || (signals.snapshots > 0 && signals.history_count > 0);
    case 'assurance': return signals.assurance > 0 || signals.history_count > 0;
    default:          return false;
  }
}

function computeCoverageScore(signals) {
  let covered = 0;
  for (const el of COVERAGE_ELEMENTS) {
    if (_elementCovered(el, signals)) covered++;
  }
  return auditMetrics.clampScore(Math.round((covered / COVERAGE_ELEMENTS.length) * 100));
}

function buildAuditCoverage(signals) {
  const coverage_score = computeCoverageScore(signals);
  return {
    coverage_score,
    coverage_status: auditMetrics.classifyCoverageStatus(coverage_score)
  };
}

async function getAuditCoverage(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  try {
    const signals = await _fetchCoverageSignals(companyId);
    const audit_coverage = buildAuditCoverage(signals);
    auditMetrics.recordAuditCoverageAnalyzed(companyId);
    return { ok: true, audit_coverage };

  } catch (err) {
    auditMetrics.recordError(companyId, 'getAuditCoverage', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  COVERAGE_ELEMENTS,
  computeCoverageScore,
  buildAuditCoverage,
  getAuditCoverage
};
