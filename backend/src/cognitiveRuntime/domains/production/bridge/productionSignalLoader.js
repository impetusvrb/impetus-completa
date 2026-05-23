'use strict';

const db = require('../../../../db');
const productionRealtime = require('../../../../services/productionRealtimeService');
const { buildOeeContext } = require('../telemetry/productionOeeContextEngine');
const { analyzeBottlenecks } = require('../telemetry/bottleneckAnalysisEngine');
const { aggregateRealtimeProduction } = require('../telemetry/realtimeProductionAggregator');

async function loadProductionTenantSignals(user = {}, ctx = {}) {
  if (ctx.mock_signals) return ctx.mock_signals;

  const companyId = user?.company_id || ctx.tenant_id;
  if (!companyId) {
    return {
      ok: false,
      reason: 'missing_company_id',
      telemetry_readiness: 'unavailable',
      raw: {}
    };
  }

  try {
    const [shiftKpis, shiftRows, monitored, maintenanceOpen, qualityOpen] = await Promise.all([
      productionRealtime.getShiftKPIs(companyId).catch(() => ({ lines: [], total_produced: 0, total_target: 0, efficiency: null })),
      productionRealtime.getShiftData(companyId).catch(() => []),
      countMonitoredPoints(companyId),
      countOpenWorkOrders(companyId),
      countOpenProposals(companyId)
    ]);

    const lines = shiftKpis.lines || [];
    const telemetry = await aggregateRealtimeProduction(companyId, { lines, shift_rows: shiftRows });
    const totalScrap = (shiftRows || []).reduce((s, r) => s + parseFloat(r.scrap_qty || 0), 0);
    const oeeCtx = buildOeeContext(lines, shiftRows);
    const bottlenecks = analyzeBottlenecks(lines, shiftRows);

    const stale = telemetry.stale_telemetry === true;
    const readiness = lines.length ? (stale ? 'degraded' : 'ready') : 'empty';

    return {
      ok: true,
      company_id: companyId,
      loaded_at: new Date().toISOString(),
      telemetry_readiness: readiness,
      signal_degradation: stale ? 'stale_shift_data' : lines.length ? 'none' : 'no_lines',
      operational: {
        oee_contextual: oeeCtx.weighted_oee,
        throughput: shiftKpis.total_produced ?? 0,
        target_qty: shiftKpis.total_target ?? 0,
        efficiency_pct: shiftKpis.efficiency,
        scrap_qty: totalScrap,
        downtime_proxy: maintenanceOpen,
        lines_active: lines.length,
        monitored_critical: monitored.critical,
        monitored_total: monitored.total,
        maintenance_open: maintenanceOpen,
        quality_nc_open: qualityOpen,
        bottleneck_score: bottlenecks.top_score,
        primary_bottleneck_line: bottlenecks.primary_line,
        energy_proxy: null,
        stability_index: oeeCtx.stability_index,
        anomaly_risk: bottlenecks.degraded_lines?.length >= 2 ? 'elevated' : 'normal'
      },
      oee_context: oeeCtx,
      bottlenecks,
      telemetry,
      raw: { shift_rows: shiftRows, lines, monitored }
    };
  } catch (err) {
    return {
      ok: false,
      reason: 'signal_load_error',
      telemetry_readiness: 'error',
      error_message: err.message,
      operational: {},
      raw: {}
    };
  }
}

async function countMonitoredPoints(companyId) {
  try {
    const r = await db.query(
      `SELECT COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE criticality = 'critical' OR operational_status IN ('failure','maintenance'))::int AS critical
       FROM monitored_points WHERE company_id = $1 AND active = true`,
      [companyId]
    );
    return { total: r.rows[0]?.total || 0, critical: r.rows[0]?.critical || 0 };
  } catch (_) {
    return { total: 0, critical: 0 };
  }
}

async function countOpenWorkOrders(companyId) {
  try {
    const r = await db.query(
      `SELECT COUNT(*)::int AS c FROM work_orders WHERE company_id = $1 AND status IN ('open','in_progress','pending')`,
      [companyId]
    );
    return r.rows[0]?.c || 0;
  } catch (_) {
    return 0;
  }
}

async function countOpenProposals(companyId) {
  try {
    const r = await db.query(
      `SELECT COUNT(*)::int AS c FROM proposals WHERE company_id = $1 AND status IN ('open','pending','in_review')`,
      [companyId]
    );
    return r.rows[0]?.c || 0;
  } catch (_) {
    return 0;
  }
}

module.exports = { loadProductionTenantSignals };
