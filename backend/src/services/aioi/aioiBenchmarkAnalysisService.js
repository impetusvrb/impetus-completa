'use strict';

/**
 * AIOI-P2.3 — Benchmark Analysis Service (READ ONLY)
 *
 * Tenant atual vs histórico do próprio tenant — sem cross-tenant.
 */

const { isValidUUID } = require('../../utils/security');
const matMetrics = require('./aioiMaturityMetrics');

const SNAPSHOTS_TABLE = 'aioi_metrics_snapshots';

async function _fetchSnapshots(companyId) {
  return matMetrics.withTenantReadClient(companyId, async (client) => {
    const result = await matMetrics.readQuery(client,
      `SELECT snapshot_type, snapshot_payload, created_at
       FROM ${SNAPSHOTS_TABLE}
       WHERE company_id = $1::uuid
       ORDER BY created_at ASC`,
      [companyId]
    );
    return result.rows || [];
  });
}

function _splitCurrentHistorical(rows) {
  const cutoff = Date.now() - matMetrics.BENCHMARK_CURRENT_DAYS * 86400000;
  const current = [];
  const historical = [];
  for (const r of rows) {
    const t = new Date(r.created_at).getTime();
    if (t >= cutoff) current.push(r);
    else historical.push(r);
  }
  return { current, historical };
}

function _backlogTotal(payload) {
  const p = matMetrics.parseSnapshotPayload(payload);
  return (Number(p.approval) || 0) + (Number(p.execution) || 0)
    + (Number(p.outcome) || 0) + (Number(p.learning) || 0);
}

function _buildBenchmarkMetric(currentRows, historicalRows, type, extractor) {
  const currentFiltered = currentRows.filter(r => r.snapshot_type === type);
  const historicalFiltered = historicalRows.filter(r => r.snapshot_type === type);

  const current = matMetrics.avgFromRows(currentFiltered, r => extractor(r));
  const historical = matMetrics.avgFromRows(historicalFiltered, r => extractor(r));

  return {
    current:    matMetrics.roundVal(current),
    historical: matMetrics.roundVal(historical),
    variation_pct: matMetrics.variationPct(current, historical)
  };
}

function buildBenchmarkAnalysisFromSnapshots(rows) {
  const { current, historical } = _splitCurrentHistorical(rows);

  return {
    success_rate: _buildBenchmarkMetric(
      current, historical, 'lifecycle_snapshot',
      r => matMetrics.parseSnapshotPayload(r.snapshot_payload).operational_success_rate
    ),
    cycle_time: _buildBenchmarkMetric(
      current, historical, 'cycle_kpis',
      r => matMetrics.parseSnapshotPayload(r.snapshot_payload).end_to_end_cycle_ms
    ),
    backlog_total: _buildBenchmarkMetric(
      current, historical, 'backlog_snapshot',
      r => _backlogTotal(r.snapshot_payload)
    )
  };
}

async function getBenchmarkAnalysis(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  try {
    const rows = await _fetchSnapshots(companyId);
    const benchmark = buildBenchmarkAnalysisFromSnapshots(rows);
    matMetrics.recordBenchmarkAnalyzed(companyId);
    return { ok: true, benchmark };

  } catch (err) {
    matMetrics.recordError(companyId, 'getBenchmarkAnalysis', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  buildBenchmarkAnalysisFromSnapshots,
  getBenchmarkAnalysis
};
