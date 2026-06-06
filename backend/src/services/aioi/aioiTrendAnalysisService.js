'use strict';

/**
 * AIOI-P2.1 — Trend Analysis Service (READ ONLY)
 *
 * Compara snapshots históricos (aioi_metrics_snapshots) — sem forecasting.
 */

const { isValidUUID } = require('../../utils/security');
const govMetrics = require('./aioiGovernanceMetrics');

const SNAPSHOTS_TABLE = 'aioi_metrics_snapshots';
const TREND_EPS = 0.1;

function classifyTrend(recentVal, olderVal) {
  if (recentVal == null || olderVal == null) return 'stable';
  const recent = Number(recentVal);
  const older = Number(olderVal);
  if (!Number.isFinite(recent) || !Number.isFinite(older) || older === 0) return 'stable';
  const delta = (recent - older) / Math.abs(older);
  if (delta > TREND_EPS) return 'degrading';
  if (delta < -TREND_EPS) return 'improving';
  return 'stable';
}

function classifyTrendInverse(recentVal, olderVal) {
  if (recentVal == null || olderVal == null) return 'stable';
  const recent = Number(recentVal);
  const older = Number(olderVal);
  if (!Number.isFinite(recent) || !Number.isFinite(older) || older === 0) return 'stable';
  const delta = (recent - older) / Math.abs(older);
  if (delta > TREND_EPS) return 'improving';
  if (delta < -TREND_EPS) return 'degrading';
  return 'stable';
}

async function _fetchSnapshotsInWindow(companyId, intervalLiteral) {
  return govMetrics.withTenantReadClient(companyId, async (client) => {
    const result = await govMetrics.readQuery(client,
      `SELECT snapshot_type, snapshot_payload, created_at
       FROM ${SNAPSHOTS_TABLE}
       WHERE company_id = $1::uuid
         AND created_at >= now() - INTERVAL '${intervalLiteral}'
       ORDER BY created_at ASC`,
      [companyId]
    );
    return result.rows || [];
  });
}

function _avgFromSnapshots(snapshots, type, fieldPath) {
  const filtered = snapshots.filter(s => s.snapshot_type === type);
  if (filtered.length === 0) return null;
  const values = filtered.map(s => {
    const payload = typeof s.snapshot_payload === 'object'
      ? s.snapshot_payload
      : JSON.parse(s.snapshot_payload || '{}');
    if (fieldPath.includes('.')) {
      const parts = fieldPath.split('.');
      let cur = payload;
      for (const p of parts) cur = cur?.[p];
      return cur;
    }
    return payload[fieldPath];
  }).filter(v => v != null && Number.isFinite(Number(v)));
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + Number(b), 0) / values.length;
}

async function getTrendAnalysis(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  try {
    const [snap24h, snap7d, snap30d] = await Promise.all([
      _fetchSnapshotsInWindow(companyId, '24 hours'),
      _fetchSnapshotsInWindow(companyId, '7 days'),
      _fetchSnapshotsInWindow(companyId, '30 days')
    ]);

    const recent24 = _avgFromSnapshots(snap24h, 'cycle_kpis', 'end_to_end_cycle_ms');
    const older7 = _avgFromSnapshots(snap7d, 'cycle_kpis', 'end_to_end_cycle_ms');
    const older30 = _avgFromSnapshots(snap30d, 'cycle_kpis', 'end_to_end_cycle_ms');

    const successRecent = _avgFromSnapshots(snap24h, 'lifecycle_snapshot', 'operational_success_rate');
    const successOlder = _avgFromSnapshots(snap30d, 'lifecycle_snapshot', 'operational_success_rate');

    const approvalRecent = _avgFromSnapshots(snap24h, 'backlog_snapshot', 'approval');
    const approvalOlder = _avgFromSnapshots(snap30d, 'backlog_snapshot', 'approval');

    const executionRecent = _avgFromSnapshots(snap24h, 'backlog_snapshot', 'execution');
    const executionOlder = _avgFromSnapshots(snap30d, 'backlog_snapshot', 'execution');

    const trend_analysis = {
      success_rate_trend:    classifyTrendInverse(successRecent, successOlder),
      cycle_time_trend:      classifyTrend(recent24 ?? older7, older30),
      approval_backlog_trend: classifyTrend(approvalRecent, approvalOlder),
      execution_backlog_trend: classifyTrend(executionRecent, executionOlder)
    };

    govMetrics.recordTrendAnalyzed(companyId);
    return { ok: true, trend_analysis };

  } catch (err) {
    govMetrics.recordError(companyId, 'getTrendAnalysis', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  classifyTrend,
  classifyTrendInverse,
  getTrendAnalysis
};
