'use strict';

/**
 * AIOI-P4.1 — Tenant Capacity Service
 *
 * Métricas de capacidade operacional por tenant piloto — READ ONLY.
 * Spec: backend/docs/AIOI_MULTI_TENANT_CAPACITY_SPECIFICATION.md
 */

const db = require('../../db');
const pilotFlags = require('./aioiPilotFlags');
const operationalMetrics = require('./aioiOperationalMetricsService');

const LAYER = 'AIOI_TENANT_CAPACITY';
const SATURATION_WARNING_THRESHOLD = 75;
const SATURATION_CRITICAL_THRESHOLD = 90;

async function _queryTenantCapacity(companyId) {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`SELECT set_config('app.current_company_id', $1, true)`, [String(companyId)]);
    await client.query(`SELECT set_config('app.bypass_rls', 'false', true)`);

    const ioeResult = await client.query(
      `SELECT
         COUNT(*) AS ioe_total,
         COUNT(*) FILTER (WHERE status NOT IN ('resolved', 'closed', 'rejected')) AS ioe_active,
         COUNT(*) FILTER (WHERE breach_state IN ('at_risk', 'AT_RISK', 'breached', 'BREACHED')) AS sla_pressure_count,
         COUNT(*) FILTER (WHERE created_at >= now() - interval '24 hours') AS ioe_last_24h,
         COUNT(*) FILTER (WHERE created_at >= now() - interval '7 days') AS ioe_last_7d
       FROM industrial_operational_events
       WHERE company_id = $1::uuid`,
      [companyId]
    );

    const outboxResult = await client.query(
      `SELECT
         COUNT(*) AS queue_volume,
         COUNT(*) FILTER (WHERE status = 'pending') AS queue_pending,
         COUNT(*) FILTER (WHERE status = 'processing') AS queue_processing,
         COUNT(*) FILTER (WHERE status = 'failed') AS queue_failed,
         COUNT(*) FILTER (WHERE status = 'delivered') AS queue_delivered
       FROM aioi_outbox
       WHERE company_id = $1::uuid
         AND consumer_type = 'classification'`,
      [companyId]
    );

    await client.query('COMMIT');

    const ioe = ioeResult.rows[0] || {};
    const outbox = outboxResult.rows[0] || {};

    const ioeTotal = parseInt(ioe.ioe_total || '0', 10);
    const ioeActive = parseInt(ioe.ioe_active || '0', 10);
    const queueVolume = parseInt(outbox.queue_volume || '0', 10);
    const queuePending = parseInt(outbox.queue_pending || '0', 10);
    const slaPressure = parseInt(ioe.sla_pressure_count || '0', 10);

    const processingUtilization = queueVolume > 0
      ? Math.round(((queueVolume - queuePending) / queueVolume) * 10000) / 100
      : 0;

    const saturationScore = ioeActive > 0
      ? Math.min(100, Math.round(((slaPressure + queuePending) / Math.max(ioeActive, 1)) * 100))
      : 0;

    let saturationLevel = 'NORMAL';
    if (saturationScore >= SATURATION_CRITICAL_THRESHOLD) saturationLevel = 'CRITICAL';
    else if (saturationScore >= SATURATION_WARNING_THRESHOLD) saturationLevel = 'WARNING';

    const growthRate24h = ioeTotal > 0
      ? Math.round((parseInt(ioe.ioe_last_24h || '0', 10) / ioeTotal) * 10000) / 100
      : 0;

    return {
      company_id:              companyId,
      tenant_throughput: {
        ioe_total:             ioeTotal,
        ioe_active:            ioeActive,
        ioe_last_24h:          parseInt(ioe.ioe_last_24h || '0', 10),
        ioe_last_7d:           parseInt(ioe.ioe_last_7d || '0', 10),
        growth_rate_24h_pct:   growthRate24h
      },
      tenant_queue_volume: {
        total:                 queueVolume,
        pending:               queuePending,
        processing:            parseInt(outbox.queue_processing || '0', 10),
        failed:                parseInt(outbox.queue_failed || '0', 10),
        delivered:             parseInt(outbox.queue_delivered || '0', 10)
      },
      tenant_sla_pressure: {
        at_risk_or_breached:   slaPressure,
        pressure_ratio_pct:    ioeActive > 0
          ? Math.round((slaPressure / ioeActive) * 10000) / 100
          : 0
      },
      tenant_processing_utilization_pct: processingUtilization,
      tenant_growth_metrics: {
        ioe_last_24h:          parseInt(ioe.ioe_last_24h || '0', 10),
        ioe_last_7d:           parseInt(ioe.ioe_last_7d || '0', 10),
        growth_rate_24h_pct:   growthRate24h
      },
      tenant_operational_saturation: {
        score:                 saturationScore,
        level:                 saturationLevel
      }
    };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error(`[${LAYER}] Erro capacity tenant`, { company_id: companyId, error: err.message });
    return { company_id: companyId, error: err.message };
  } finally {
    client.release();
  }
}

/**
 * Snapshot agregado de capacidade multi-tenant.
 * @returns {Promise<object>}
 */
async function getTenantCapacitySnapshot() {
  const tenants = pilotFlags.getPilotTenants();
  const tenantCapacities = [];

  for (const companyId of tenants) {
    tenantCapacities.push(await _queryTenantCapacity(companyId));
  }

  const aggregate = tenantCapacities.reduce((acc, t) => {
    if (t.error) return acc;
    acc.ioe_total += t.tenant_throughput?.ioe_total || 0;
    acc.queue_volume += t.tenant_queue_volume?.total || 0;
    acc.sla_pressure += t.tenant_sla_pressure?.at_risk_or_breached || 0;
    acc.saturation_scores.push(t.tenant_operational_saturation?.score || 0);
    return acc;
  }, { ioe_total: 0, queue_volume: 0, sla_pressure: 0, saturation_scores: [] });

  const avgSaturation = aggregate.saturation_scores.length
    ? Math.round(aggregate.saturation_scores.reduce((a, b) => a + b, 0) / aggregate.saturation_scores.length)
    : 0;

  return {
    ok: true,
    layer: LAYER,
    pilot_tenant_count: tenants.length,
    tenants: tenantCapacities,
    aggregate: {
      ioe_total:           aggregate.ioe_total,
      queue_volume:        aggregate.queue_volume,
      sla_pressure_total:  aggregate.sla_pressure,
      avg_saturation_score: avgSaturation
    },
    captured_at: new Date().toISOString()
  };
}

module.exports = {
  getTenantCapacitySnapshot,
  getTenantCapacityForCompany: _queryTenantCapacity,
  LAYER,
  SATURATION_WARNING_THRESHOLD,
  SATURATION_CRITICAL_THRESHOLD
};
