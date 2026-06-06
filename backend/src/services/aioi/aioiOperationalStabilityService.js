'use strict';

/**
 * AIOI-P2.3 — Operational Stability Service (READ ONLY)
 *
 * Volatilidade de backlog, throughput e SLA via snapshots históricos.
 */

const { isValidUUID } = require('../../utils/security');
const matMetrics = require('./aioiMaturityMetrics');

const SNAPSHOTS_TABLE = 'aioi_metrics_snapshots';

async function _fetchRecentSnapshots(companyId) {
  return matMetrics.withTenantReadClient(companyId, async (client) => {
    const result = await matMetrics.readQuery(client,
      `SELECT snapshot_type, snapshot_payload, created_at
       FROM ${SNAPSHOTS_TABLE}
       WHERE company_id = $1::uuid
         AND created_at >= now() - INTERVAL '${matMetrics.BENCHMARK_CURRENT_DAYS} days'
       ORDER BY created_at ASC`,
      [companyId]
    );
    return result.rows || [];
  });
}

function _backlogTotal(payload) {
  const p = matMetrics.parseSnapshotPayload(payload);
  return (Number(p.approval) || 0) + (Number(p.execution) || 0)
    + (Number(p.outcome) || 0) + (Number(p.learning) || 0);
}

function computeStabilityFromSnapshots(rows) {
  const backlogVals = rows
    .filter(r => r.snapshot_type === 'backlog_snapshot')
    .map(r => _backlogTotal(r.snapshot_payload));

  const throughputVals = rows
    .filter(r => r.snapshot_type === 'throughput_snapshot')
    .map(r => Number(matMetrics.parseSnapshotPayload(r.snapshot_payload).daily_throughput) || 0)
    .filter(v => v > 0);

  const slaVals = rows
    .filter(r => r.snapshot_type === 'cycle_kpis')
    .map(r => Number(matMetrics.parseSnapshotPayload(r.snapshot_payload).end_to_end_cycle_ms) || 0)
    .filter(v => v > 0);

  const backlogVol = matMetrics.coefficientOfVariation(backlogVals);
  const throughputVol = throughputVals.length
    ? matMetrics.coefficientOfVariation(throughputVals)
    : backlogVol * 0.5;
  const slaVol = matMetrics.coefficientOfVariation(slaVals);

  const avgVol = (backlogVol + throughputVol + slaVol) / 3;
  const penalty = Math.min(100, avgVol * 200);
  const stability_score = matMetrics.clampScore(100 - penalty);

  return { stability_score, avgVol, backlogVol, throughputVol, slaVol };
}

function classifyStabilityStatus(score) {
  if (score >= 80) return 'stable';
  if (score >= 50) return 'moderate';
  return 'unstable';
}

async function getOperationalStability(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  try {
    const rows = await _fetchRecentSnapshots(companyId);
    const { stability_score } = computeStabilityFromSnapshots(rows);
    const stability = {
      stability_score,
      stability_status: classifyStabilityStatus(stability_score)
    };

    matMetrics.recordStabilityAnalyzed(companyId);
    return { ok: true, stability };

  } catch (err) {
    matMetrics.recordError(companyId, 'getOperationalStability', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  computeStabilityFromSnapshots,
  classifyStabilityStatus,
  getOperationalStability
};
