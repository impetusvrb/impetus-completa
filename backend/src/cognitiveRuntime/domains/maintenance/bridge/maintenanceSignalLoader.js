'use strict';

const db = require('../../../../db');

async function loadMaintenanceTenantSignals(user = {}, ctx = {}) {
  if (ctx.mock_signals) return ctx.mock_signals;

  const companyId = user?.company_id || ctx.tenant_id;
  if (!companyId) {
    return { ok: false, reason: 'missing_company_id', telemetry_readiness: 'unavailable', raw: {} };
  }

  try {
    const [maintenanceOpen, downtimeEvents, assets] = await Promise.all([
      countMaintenanceOpen(companyId),
      loadDowntimeProxy(companyId),
      loadAssetProxy(companyId)
    ]);

    const readiness =
      assets.count > 0 || maintenanceOpen > 0 || downtimeEvents.total_minutes > 0
        ? downtimeEvents.stale
          ? 'degraded'
          : 'ready'
        : 'empty';

    return {
      ok: true,
      company_id: companyId,
      loaded_at: new Date().toISOString(),
      telemetry_readiness: readiness,
      signal_degradation: downtimeEvents.stale ? 'stale_maintenance' : readiness === 'empty' ? 'no_feed' : 'none',
      operational: {
        maintenance_open: maintenanceOpen,
        downtime_minutes: downtimeEvents.total_minutes,
        downtime_events: downtimeEvents.events,
        asset_count: assets.count,
        critical_assets: assets.critical,
        mtbf_hours_proxy: downtimeEvents.mtbf_hours_proxy,
        mttr_hours_proxy: downtimeEvents.mttr_hours_proxy,
        availability_pct: downtimeEvents.availability_pct,
        failure_recurrence: downtimeEvents.recurrence,
        vibration_proxy: assets.vibration_proxy,
        temperature_proxy: assets.temperature_proxy,
        stability_score: assets.stability_score,
        degradation_signals: assets.degradation_signals
      },
      raw: { maintenanceOpen, downtimeEvents, assets }
    };
  } catch (err) {
    return {
      ok: false,
      reason: 'signal_load_error',
      telemetry_readiness: 'error',
      error_message: err.message,
      raw: {}
    };
  }
}

async function countMaintenanceOpen(companyId) {
  try {
    const r = await db.query(
      `SELECT COUNT(*)::int AS c FROM maintenance_orders
       WHERE company_id = $1 AND status IN ('open','in_progress','pending')`,
      [companyId]
    );
    return r.rows[0]?.c ?? 0;
  } catch (_) {
    return 0;
  }
}

async function loadDowntimeProxy(companyId) {
  try {
    const r = await db.query(
      `SELECT COALESCE(SUM(duration_minutes),0)::float AS total_minutes,
              COUNT(*)::int AS events
       FROM production_downtime_events
       WHERE company_id = $1 AND started_at >= NOW() - INTERVAL '30 days'`,
      [companyId]
    );
    const total = r.rows[0]?.total_minutes ?? 0;
    const events = r.rows[0]?.events ?? 0;
    const mttr = events > 0 ? total / events / 60 : null;
    const mtbf = events > 1 ? (30 * 24) / events : null;
    const availability = Math.max(0, Math.min(100, 100 - (total / (30 * 24 * 60)) * 100));
    return {
      total_minutes: total,
      events,
      mtbf_hours_proxy: mtbf,
      mttr_hours_proxy: mttr,
      availability_pct: Number(availability.toFixed(2)),
      recurrence: events >= 3 ? 'elevated' : events > 0 ? 'normal' : 'none',
      stale: false
    };
  } catch (_) {
    return {
      total_minutes: 0,
      events: 0,
      mtbf_hours_proxy: null,
      mttr_hours_proxy: null,
      availability_pct: null,
      recurrence: 'none',
      stale: true
    };
  }
}

async function loadAssetProxy(companyId) {
  try {
    const r = await db.query(
      `SELECT COUNT(*)::int AS c,
              COUNT(*) FILTER (WHERE criticality IN ('high','critical'))::int AS critical
       FROM assets WHERE company_id = $1`,
      [companyId]
    );
    const count = r.rows[0]?.c ?? 0;
    const critical = r.rows[0]?.critical ?? 0;
    return {
      count,
      critical,
      vibration_proxy: count > 0 ? null : null,
      temperature_proxy: null,
      stability_score: count > 0 ? 85 : null,
      degradation_signals: count > 0 ? 0 : 0
    };
  } catch (_) {
    return { count: 0, critical: 0, vibration_proxy: null, temperature_proxy: null, stability_score: null, degradation_signals: 0 };
  }
}

module.exports = { loadMaintenanceTenantSignals };
