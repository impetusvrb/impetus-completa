'use strict';

/**
 * AIOI-P6.3 — Longitudinal Operational Analytics Service
 *
 * Análise longitudinal 30d/60d/90d — READ ONLY.
 * Spec: backend/docs/AIOI_LONGITUDINAL_ANALYTICS_SPECIFICATION.md
 */

const db = require('../../db');
const pilotFlags = require('./aioiPilotFlags');
const operationalTrends = require('./aioiOperationalTrendService');
const slaCompliance = require('./aioiSlaComplianceService');
const complianceAnalytics = require('./aioiComplianceAnalyticsService');

const LAYER = 'AIOI_LONGITUDINAL_ANALYTICS';
const WINDOWS = [30, 60, 90];

async function _queryWindowMetrics(tenantIds, days) {
  if (!tenantIds.length) {
    return {
      throughput: { outbox_delivered: 0, ioe_created: 0 },
      latency:    { avg_outbox_latency_ms: null },
      sla:        { breached: 0, at_risk: 0 },
      health:     { outbox_failed: 0, outbox_pending: 0 },
      dlq:        { count: 0 },
      compliance: { rate: 100 }
    };
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`SELECT set_config('app.bypass_rls', 'true', true)`);

    const interval = `${days} days`;

    const [outboxResult, ioeResult, failedResult] = await Promise.all([
      client.query(
        `SELECT
           COUNT(*) FILTER (WHERE status = 'delivered') AS outbox_delivered,
           ROUND(AVG(EXTRACT(EPOCH FROM (processed_at - created_at)) * 1000)
             FILTER (WHERE processed_at IS NOT NULL)) AS avg_outbox_latency_ms,
           COUNT(*) FILTER (WHERE status = 'failed') AS outbox_failed,
           COUNT(*) FILTER (WHERE status = 'pending') AS outbox_pending,
           COUNT(*) FILTER (WHERE status = 'failed') AS dlq_count
         FROM aioi_outbox
         WHERE company_id = ANY($1::uuid[])
           AND created_at >= now() - $2::interval`,
        [tenantIds, interval]
      ),
      client.query(
        `SELECT COUNT(*) AS ioe_created
         FROM industrial_operational_events
         WHERE company_id = ANY($1::uuid[])
           AND created_at >= now() - $2::interval`,
        [tenantIds, interval]
      ),
      client.query(
        `SELECT
           COUNT(*) FILTER (WHERE breach_state IN ('breached', 'BREACHED')) AS sla_breached,
           COUNT(*) FILTER (WHERE breach_state IN ('at_risk', 'AT_RISK')) AS sla_at_risk,
           COUNT(*) AS sla_total
         FROM industrial_operational_events
         WHERE company_id = ANY($1::uuid[])
           AND created_at >= now() - $2::interval
           AND breach_state IS NOT NULL`,
        [tenantIds, interval]
      )
    ]);

    await client.query('COMMIT');

    const outbox = outboxResult.rows[0] || {};
    const ioe = ioeResult.rows[0] || {};
    const sla = failedResult.rows[0] || {};
    const slaTotal = parseInt(sla.sla_total || '0', 10);
    const slaBreached = parseInt(sla.sla_breached || '0', 10);
    const complianceRate = slaTotal > 0
      ? Math.round(((slaTotal - slaBreached) / slaTotal) * 10000) / 100
      : 100;

    return {
      throughput: {
        outbox_delivered: parseInt(outbox.outbox_delivered || '0', 10),
        ioe_created:      parseInt(ioe.ioe_created || '0', 10)
      },
      latency: {
        avg_outbox_latency_ms: outbox.avg_outbox_latency_ms != null
          ? Number(outbox.avg_outbox_latency_ms)
          : null
      },
      sla: {
        breached: parseInt(sla.sla_breached || '0', 10),
        at_risk:  parseInt(sla.sla_at_risk || '0', 10)
      },
      health: {
        outbox_failed:  parseInt(outbox.outbox_failed || '0', 10),
        outbox_pending: parseInt(outbox.outbox_pending || '0', 10)
      },
      dlq: {
        count: parseInt(outbox.dlq_count || '0', 10)
      },
      compliance: {
        rate: complianceRate
      }
    };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error(`[${LAYER}] Erro window metrics ${days}d`, { error: err.message });
    return {
      throughput: { outbox_delivered: 0, ioe_created: 0 },
      latency:    { avg_outbox_latency_ms: null },
      sla:        { breached: 0, at_risk: 0 },
      health:     { outbox_failed: 0, outbox_pending: 0 },
      dlq:        { count: 0 },
      compliance: { rate: 100 }
    };
  } finally {
    client.release();
  }
}

function _computeTrendEvolution(windows) {
  const delivered = windows.map(w => w.metrics.throughput.outbox_delivered);
  const compliance = windows.map(w => w.metrics.compliance.rate);
  if (delivered.every(v => v === 0)) return 'INSUFFICIENT_DATA';
  const delta = delivered[delivered.length - 1] - delivered[0];
  if (delta > 0) return 'GROWING';
  if (delta < 0) return 'DECLINING';
  const compDelta = compliance[compliance.length - 1] - compliance[0];
  if (compDelta > 0) return 'COMPLIANCE_IMPROVING';
  if (compDelta < 0) return 'COMPLIANCE_DECLINING';
  return 'STABLE';
}

/**
 * Analytics longitudinal 30d/60d/90d.
 * @returns {Promise<object>}
 */
async function getLongitudinalAnalytics() {
  const tenants = pilotFlags.getPilotTenants();
  const [windowResults, trends, sla, analytics] = await Promise.all([
    Promise.all(WINDOWS.map(async days => ({
      window_days: days,
      metrics: await _queryWindowMetrics(tenants, days)
    }))),
    Promise.resolve(operationalTrends.getOperationalTrends()),
    slaCompliance.getSlaComplianceSnapshot(),
    complianceAnalytics.getComplianceAnalytics()
  ]);

  const trendEvolution = _computeTrendEvolution(windowResults);

  return {
    ok: true,
    layer: LAYER,
    windows: {
      '30d': windowResults.find(w => w.window_days === 30)?.metrics,
      '60d': windowResults.find(w => w.window_days === 60)?.metrics,
      '90d': windowResults.find(w => w.window_days === 90)?.metrics
    },
    throughput: {
      '30d': windowResults[0]?.metrics.throughput,
      '60d': windowResults[1]?.metrics.throughput,
      '90d': windowResults[2]?.metrics.throughput
    },
    latency: {
      '30d': windowResults[0]?.metrics.latency,
      '60d': windowResults[1]?.metrics.latency,
      '90d': windowResults[2]?.metrics.latency
    },
    sla: {
      '30d': windowResults[0]?.metrics.sla,
      '60d': windowResults[1]?.metrics.sla,
      '90d': windowResults[2]?.metrics.sla,
      current_snapshot: {
        compliance_rate: sla.sla_compliance_rate,
        breached:        sla.sla_breached,
        at_risk:         sla.sla_at_risk
      }
    },
    health: {
      '30d': windowResults[0]?.metrics.health,
      '60d': windowResults[1]?.metrics.health,
      '90d': windowResults[2]?.metrics.health
    },
    dlq: {
      '30d': windowResults[0]?.metrics.dlq,
      '60d': windowResults[1]?.metrics.dlq,
      '90d': windowResults[2]?.metrics.dlq
    },
    compliance: {
      '30d': windowResults[0]?.metrics.compliance,
      '60d': windowResults[1]?.metrics.compliance,
      '90d': windowResults[2]?.metrics.compliance,
      overall_score: analytics.overall_compliance_score
    },
    trend_evolution: {
      direction:       trendEvolution,
      operational:     trends.trends || null,
      snapshot_count:  trends.snapshot_count || 0
    },
    pilot_tenant_count: tenants.length,
    captured_at: new Date().toISOString()
  };
}

module.exports = {
  getLongitudinalAnalytics,
  LAYER
};
