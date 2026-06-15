'use strict';

/**
 * P0A.4 — Operational Observation Registry Service
 * READ ONLY · OBSERVATIONAL ONLY
 */

const LAYER = 'P0A_OPERATIONAL_OBSERVATION_REGISTRY';

async function _query(db, sql, params = []) {
  const query = db.query ? db.query.bind(db) : db.pool.query.bind(db.pool);
  return (await query(sql, params)).rows;
}

async function collectObservationSnapshot(db, options = {}) {
  const windowHours = options.windowHours ?? 1;

  const [
    ioeHour,
    ioeByTenant,
    outboxHour,
    outboxDelivered,
    plcHour,
    wfActivity,
    ceoActivity,
    iaActivity,
    activeTenants
  ] = await Promise.all([
    _query(db, `
      SELECT COUNT(*)::int AS cnt
      FROM industrial_operational_events
      WHERE created_at > NOW() - ($1::text || ' hours')::interval
    `, [String(windowHours)]),
    _query(db, `
      SELECT company_id, COUNT(*)::int AS cnt
      FROM industrial_operational_events
      WHERE created_at > NOW() - ($1::text || ' hours')::interval
      GROUP BY company_id ORDER BY cnt DESC LIMIT 10
    `, [String(windowHours)]),
    _query(db, `
      SELECT COUNT(*)::int AS cnt
      FROM aioi_outbox
      WHERE created_at > NOW() - ($1::text || ' hours')::interval
    `, [String(windowHours)]),
    _query(db, `
      SELECT
        COUNT(*)::int AS total,
        SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END)::int AS delivered
      FROM aioi_outbox
      WHERE created_at > NOW() - ($1::text || ' hours')::interval
    `, [String(windowHours)]),
    _query(db, `
      SELECT COUNT(*)::int AS cnt
      FROM plc_collected_data
      WHERE collected_at > NOW() - ($1::text || ' hours')::interval
    `, [String(windowHours)]),
    _query(db, `
      SELECT status, COUNT(*)::int AS cnt
      FROM industrial_workflow_instances
      GROUP BY status ORDER BY cnt DESC
    `),
    _query(db, `
      SELECT COUNT(*)::int AS cnt
      FROM ai_interaction_traces t
      INNER JOIN users u ON u.id = t.user_id
      WHERE u.role = 'ceo'
        AND t.created_at > NOW() - ($1::text || ' hours')::interval
    `, [String(windowHours)]),
    _query(db, `
      SELECT module_name, COUNT(*)::int AS cnt
      FROM ai_interaction_traces
      WHERE created_at > NOW() - ($1::text || ' hours')::interval
      GROUP BY module_name ORDER BY cnt DESC LIMIT 8
    `, [String(windowHours)]),
    _query(db, `
      SELECT COUNT(DISTINCT company_id)::int AS cnt
      FROM industrial_operational_events
      WHERE created_at > NOW() - INTERVAL '24 hours'
    `)
  ]);

  const outTotal = outboxDelivered[0]?.total ?? 0;
  const outDel = outboxDelivered[0]?.delivered ?? 0;
  const outboxDeliveryRatePct =
    outTotal > 0 ? Math.round((outDel / outTotal) * 1000) / 10 : null;

  const wfRunning = wfActivity.find((w) => w.status === 'running')?.cnt ?? 0;
  const wfCompleted = wfActivity.find((w) => w.status === 'completed')?.cnt ?? 0;

  return {
    layer: LAYER,
    mode: 'OBSERVATIONAL_READ_ONLY',
    generated_at: new Date().toISOString(),
    window_hours: windowHours,
    events_per_hour: {
      ioe: ioeHour[0]?.cnt ?? 0,
      outbox: outboxHour[0]?.cnt ?? 0,
      plc_telemetry: plcHour[0]?.cnt ?? 0
    },
    events_per_tenant: ioeByTenant,
    outbox_delivery: {
      window_total: outTotal,
      delivered: outDel,
      delivery_rate_pct: outboxDeliveryRatePct
    },
    workflow_activity: {
      by_status: wfActivity,
      running: wfRunning,
      completed: wfCompleted,
      workflow_rate_per_hour: null
    },
    ceo_activity: {
      traces_last_window: ceoActivity[0]?.cnt ?? 0
    },
    ia_activity: {
      by_module: iaActivity,
      total_last_window: iaActivity.reduce((s, r) => s + (r.cnt || 0), 0)
    },
    active_tenants_24h: activeTenants[0]?.cnt ?? 0,
    dashboard_metrics: {
      ioe_per_hour: ioeHour[0]?.cnt ?? 0,
      outbox_delivery_rate_pct: outboxDeliveryRatePct,
      active_tenants: activeTenants[0]?.cnt ?? 0,
      plc_telemetry_rate_per_hour: plcHour[0]?.cnt ?? 0,
      workflow_running: wfRunning,
      queue_health: 'edge_pending_check_via_readiness'
    }
  };
}

module.exports = {
  LAYER,
  collectObservationSnapshot
};
