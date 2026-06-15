'use strict';

/**
 * P0E.3 — First 72h Monitoring Service
 * READ ONLY · OBSERVATIONAL ONLY
 */

const LAYER = 'P0E_FIRST_72H_MONITORING';
const WINDOW_HOURS = 72;

async function _query(db, sql, params = []) {
  const query = db.query ? db.query.bind(db) : db.pool.query.bind(db.pool);
  return (await query(sql, params)).rows;
}

async function monitorFirst72Hours(db, options = {}) {
  const hours = options.windowHours ?? WINDOW_HOURS;
  const since = options.since || null;
  const timeFilter = since
    ? 'created_at > $1::timestamptz'
    : `created_at > NOW() - ($1::text || ' hours')::interval`;
  const param = since || String(hours);

  const [ioeTotal, ioeDaily, pendingNow, pendingDay1, byTenant, wfStatus, wfWindow] =
    await Promise.all([
      _query(db, `SELECT COUNT(*)::int AS cnt FROM industrial_operational_events WHERE ${timeFilter}`, [param]),
      _query(db, `
        SELECT date_trunc('day', created_at) AS day, COUNT(*)::int AS cnt
        FROM industrial_operational_events WHERE ${timeFilter}
        GROUP BY 1 ORDER BY 1 DESC LIMIT 3
      `, [param]),
      _query(db, `SELECT COUNT(*)::int AS cnt FROM aioi_outbox WHERE processed_at IS NULL`),
      _query(db, `
        SELECT COUNT(*)::int AS cnt FROM aioi_outbox
        WHERE processed_at IS NULL
          AND created_at < NOW() - INTERVAL '24 hours'
      `),
      _query(db, `
        SELECT company_id, COUNT(*)::int AS cnt
        FROM industrial_operational_events WHERE ${timeFilter}
        GROUP BY company_id ORDER BY cnt DESC
      `, [param]),
      _query(db, `SELECT status, COUNT(*)::int AS cnt FROM industrial_workflow_instances GROUP BY status`),
      _query(db, `
        SELECT status, COUNT(*)::int AS cnt FROM industrial_workflow_instances
        WHERE started_at > ${since ? '$1::timestamptz' : `NOW() - ($1::text || ' hours')::interval`}
        GROUP BY status
      `, [param])
    ]);

  const throughputPerHour =
    hours > 0 ? Math.round(((ioeTotal[0]?.cnt ?? 0) / hours) * 10) / 10 : 0;
  const backlogGrowth = (pendingNow[0]?.cnt ?? 0) - (pendingDay1[0]?.cnt ?? 0);
  const wfFailed = wfStatus.find((w) => w.status === 'failed')?.cnt ?? 0;

  const first72hStable =
    (pendingNow[0]?.cnt ?? 0) === 0 &&
    backlogGrowth <= 0 &&
    wfFailed === 0 &&
    (ioeTotal[0]?.cnt ?? 0) > 0;

  return {
    window_hours: hours,
    throughput_ioe_per_hour: throughputPerHour,
    ioe_total: ioeTotal[0]?.cnt ?? 0,
    daily_ioe: ioeDaily,
    backlog_current: pendingNow[0]?.cnt ?? 0,
    backlog_older_24h: pendingDay1[0]?.cnt ?? 0,
    backlog_growth: backlogGrowth,
    tenant_activity: byTenant,
    active_tenants: byTenant.length,
    workflow_all_time: wfStatus,
    workflow_in_window: wfWindow,
    workflow_failed: wfFailed,
    first_72h_stable: first72hStable
  };
}

module.exports = {
  LAYER,
  WINDOW_HOURS,
  monitorFirst72Hours
};
