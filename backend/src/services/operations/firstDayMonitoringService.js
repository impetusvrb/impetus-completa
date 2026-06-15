'use strict';

/**
 * P0E.2 — First 24h Monitoring Service
 * READ ONLY · OBSERVATIONAL ONLY
 */

const { execSync } = require('child_process');

const LAYER = 'P0E_FIRST_24H_MONITORING';
const WINDOW_HOURS = 24;

async function _query(db, sql, params = []) {
  const query = db.query ? db.query.bind(db) : db.pool.query.bind(db.pool);
  return (await query(sql, params)).rows;
}

function _getPm2Meta() {
  try {
    const raw = execSync('pm2 jlist', { timeout: 5000, encoding: 'utf8' });
    const be = JSON.parse(raw).find((p) => p.name === 'impetus-backend');
    if (!be) return { found: false };
    return {
      found: true,
      status: be.pm2_env?.status,
      restarts: be.pm2_env?.restart_time ?? 0,
      unstable_restarts: be.pm2_env?.unstable_restarts ?? 0,
      uptime_hours: be.pm2_env?.pm_uptime
        ? Math.round(((Date.now() - be.pm2_env.pm_uptime) / 3600000) * 10) / 10
        : null,
      memory_bytes: be.monit?.memory ?? null,
      cpu_pct: be.monit?.cpu ?? null
    };
  } catch (err) {
    return { found: false, error: err.message };
  }
}

function _getWorkers() {
  try {
    const outbox = require('../aioi/aioiOutboxWorkerService');
    const continuous = require('../aioi/runtime/aioiContinuousWorkerService');
    return {
      outbox_running: outbox.getWorkerStatus?.()?.worker_running === true,
      continuous_running: continuous.getWorkerStatus?.()?.worker_running === true
    };
  } catch {
    return { outbox_running: false, continuous_running: false };
  }
}

async function monitorFirst24Hours(db, options = {}) {
  const hours = options.windowHours ?? WINDOW_HOURS;
  const since = options.since || null;

  const intervalClause = since
    ? `created_at > $1::timestamptz AND created_at <= NOW()`
    : `created_at > NOW() - ($1::text || ' hours')::interval`;

  const [ioeCount, ioeHourly, deliveries, failed, pending, retries] = await Promise.all([
    _query(db, `
      SELECT COUNT(*)::int AS cnt FROM industrial_operational_events
      WHERE ${since ? 'created_at > $1::timestamptz' : `created_at > NOW() - ($1::text || ' hours')::interval`}
    `, [since || String(hours)]),
    _query(db, `
      SELECT date_trunc('hour', created_at) AS hour, COUNT(*)::int AS cnt
      FROM industrial_operational_events
      WHERE ${since ? 'created_at > $1::timestamptz' : `created_at > NOW() - ($1::text || ' hours')::interval`}
      GROUP BY 1 ORDER BY 1 DESC LIMIT 24
    `, [since || String(hours)]),
    _query(db, `
      SELECT COUNT(*)::int AS cnt FROM aioi_outbox
      WHERE status = 'delivered'
        AND processed_at > ${since ? '$1::timestamptz' : `NOW() - ($1::text || ' hours')::interval`}
    `, [since || String(hours)]),
    _query(db, `SELECT COUNT(*)::int AS cnt FROM aioi_outbox WHERE status = 'failed'`),
    _query(db, `SELECT COUNT(*)::int AS cnt FROM aioi_outbox WHERE processed_at IS NULL`),
    _query(db, `
      SELECT COUNT(*)::int AS cnt FROM aioi_outbox
      WHERE retry_count > 0
        AND created_at > ${since ? '$1::timestamptz' : `NOW() - ($1::text || ' hours')::interval`}
    `, [since || String(hours)]).catch(() => [{ cnt: 0 }])
  ]);

  const pm2 = _getPm2Meta();
  const workers = _getWorkers();
  const ioeTotal = ioeCount[0]?.cnt ?? 0;
  const ioePerHour = hours > 0 ? Math.round((ioeTotal / hours) * 10) / 10 : 0;
  const deliveriesPerHour = hours > 0 ? Math.round(((deliveries[0]?.cnt ?? 0) / hours) * 10) / 10 : 0;

  const first24hStable =
    (failed[0]?.cnt ?? 0) === 0 &&
    (pending[0]?.cnt ?? 0) === 0 &&
    (retries[0]?.cnt ?? 0) === 0 &&
    pm2.found &&
    pm2.status === 'online';

  return {
    window_hours: hours,
    ioe_total: ioeTotal,
    ioe_per_hour: ioePerHour,
    deliveries_total: deliveries[0]?.cnt ?? 0,
    deliveries_per_hour: deliveriesPerHour,
    hourly_ioe: ioeHourly,
    backlog_pending: pending[0]?.cnt ?? 0,
    failed_total: failed[0]?.cnt ?? 0,
    retries_in_window: retries[0]?.cnt ?? 0,
    workers,
    pm2,
    first_24h_stable: first24hStable && ioeTotal > 0
  };
}

module.exports = {
  LAYER,
  WINDOW_HOURS,
  monitorFirst24Hours
};
