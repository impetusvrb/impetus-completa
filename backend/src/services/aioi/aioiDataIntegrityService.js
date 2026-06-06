'use strict';

/**
 * AIOI-P3.0 — Data Integrity Analysis Service (READ ONLY)
 *
 * Coerência entre snapshots, processing_history, audit_events e IOE.
 */

const { isValidUUID } = require('../../utils/security');
const trustMetrics = require('./aioiTrustMetrics');
const bottleneckService = require('./aioiBottleneckAnalysisService');

const IOE_TABLE = 'industrial_operational_events';
const SNAPSHOTS_TABLE = 'aioi_metrics_snapshots';
const HISTORY_TABLE = 'aioi_processing_history';
const AUDIT_TABLE = 'aioi_audit_events';

async function _fetchIntegrityCounts(companyId) {
  return trustMetrics.withTenantReadClient(companyId, async (client) => {
    const [ioe, snaps, hist, audit, resolved] = await Promise.all([
      trustMetrics.readQuery(client,
        `SELECT COUNT(*) AS cnt FROM ${IOE_TABLE} WHERE company_id = $1::uuid`, [companyId]),
      trustMetrics.readQuery(client,
        `SELECT COUNT(*) AS cnt FROM ${SNAPSHOTS_TABLE} WHERE company_id = $1::uuid`, [companyId]),
      trustMetrics.readQuery(client,
        `SELECT COUNT(*) AS cnt FROM ${HISTORY_TABLE} WHERE company_id = $1::uuid`, [companyId]),
      trustMetrics.readQuery(client,
        `SELECT COUNT(*) AS cnt FROM ${AUDIT_TABLE} WHERE company_id = $1::uuid`, [companyId]),
      trustMetrics.readQuery(client,
        `SELECT COUNT(*) AS cnt FROM ${IOE_TABLE}
         WHERE company_id = $1::uuid AND status IN ('resolved', 'closed')`, [companyId])
    ]);
    return {
      ioe_count:       parseInt(ioe.rows[0]?.cnt || '0', 10),
      snapshot_count:  parseInt(snaps.rows[0]?.cnt || '0', 10),
      history_count:   parseInt(hist.rows[0]?.cnt || '0', 10),
      audit_count:     parseInt(audit.rows[0]?.cnt || '0', 10),
      resolved_count:  parseInt(resolved.rows[0]?.cnt || '0', 10)
    };
  });
}

async function _fetchLatestBacklogSnapshot(companyId) {
  return trustMetrics.withTenantReadClient(companyId, async (client) => {
    const result = await trustMetrics.readQuery(client,
      `SELECT snapshot_payload FROM ${SNAPSHOTS_TABLE}
       WHERE company_id = $1::uuid AND snapshot_type = 'backlog_snapshot'
       ORDER BY created_at DESC LIMIT 1`,
      [companyId]
    );
    return result.rows[0] || null;
  });
}

function computeIntegrityScore({ counts, bottlenecks, latestSnapshot }) {
  let score = 0;

  if (counts.ioe_count > 0) score += 20;
  if (counts.snapshot_count > 0) score += 20;
  if (counts.history_count > 0) score += 20;
  if (counts.audit_count > 0) score += 15;

  if (counts.resolved_count > 0 && counts.history_count > 0) score += 10;
  else if (counts.resolved_count === 0) score += 5;

  if (bottlenecks && latestSnapshot) {
    const payload = trustMetrics.parseSnapshotPayload(latestSnapshot.snapshot_payload);
    const snapTotal = (payload.approval || 0) + (payload.execution || 0) +
      (payload.outcome || 0) + (payload.learning || 0);
    const liveTotal =
      (bottlenecks.approval_backlog || 0) + (bottlenecks.execution_backlog || 0) +
      (bottlenecks.outcome_backlog || 0) + (bottlenecks.learning_backlog || 0);
    const alignment = trustMetrics.forecastAccuracy(snapTotal, liveTotal);
    score += Math.round(alignment * 0.15);
  } else {
    score += 5;
  }

  return trustMetrics.clampScore(score);
}

function buildDataIntegrity(signals) {
  const integrity_score = computeIntegrityScore(signals);
  return {
    integrity_score,
    integrity_status: trustMetrics.classifyIntegrityStatus(integrity_score)
  };
}

async function getDataIntegrity(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  try {
    const [counts, bottleneckRes, latestSnapshot] = await Promise.all([
      _fetchIntegrityCounts(companyId),
      bottleneckService.getBottleneckSummary(companyId),
      _fetchLatestBacklogSnapshot(companyId)
    ]);

    if (!bottleneckRes.ok) {
      trustMetrics.recordError(companyId, 'getDataIntegrity', bottleneckRes.error);
      return { ok: false, error: bottleneckRes.error };
    }

    const data_integrity = buildDataIntegrity({
      counts,
      bottlenecks:    bottleneckRes.bottlenecks,
      latestSnapshot
    });

    trustMetrics.recordIntegrityAnalyzed(companyId);
    return { ok: true, data_integrity };

  } catch (err) {
    trustMetrics.recordError(companyId, 'getDataIntegrity', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  computeIntegrityScore,
  buildDataIntegrity,
  getDataIntegrity
};
