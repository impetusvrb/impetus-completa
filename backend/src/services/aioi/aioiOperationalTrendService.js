'use strict';

/**
 * AIOI-P4.4 — Operational Trend Service
 *
 * Análise de tendências operacionais — read only.
 * Spec: backend/docs/AIOI_OPERATIONAL_TRENDS_SPECIFICATION.md
 */

const operationalEvidence = require('./aioiOperationalEvidenceService');
const operationalHealth = require('./aioiOperationalHealthService');
const tenantCapacity = require('./aioiTenantCapacityService');
const slaCompliance = require('./aioiSlaComplianceService');
const productionStability = require('./aioiProductionStabilityService');

const LAYER = 'AIOI_OPERATIONAL_TRENDS';
const MAX_TREND_SNAPSHOTS = 100;

const _trendSnapshots = [];

function _computeTrendDirection(values) {
  if (values.length < 2) return 'STABLE';
  const recent = values.slice(-3);
  const first = recent[0];
  const last = recent[recent.length - 1];
  const delta = last - first;
  const threshold = Math.max(Math.abs(first) * 0.1, 1);
  if (delta > threshold) return 'UP';
  if (delta < -threshold) return 'DOWN';
  return 'STABLE';
}

/**
 * Regista snapshot de tendências (ring buffer).
 * @returns {Promise<object>}
 */
async function captureTrendSnapshot() {
  const [evidence, health, capacity, sla, stability] = await Promise.all([
    operationalEvidence.collectOperationalEvidence(),
    operationalHealth.getHealthSnapshot(),
    tenantCapacity.getTenantCapacitySnapshot(),
    slaCompliance.getSlaComplianceSnapshot(),
    Promise.resolve(productionStability.getStabilitySnapshot())
  ]);

  const snapshot = {
    throughput: {
      classification_rate: evidence.throughput.classification_rate,
      outbox_delivered:  evidence.throughput.outbox_delivered,
      decision_rate:     evidence.throughput.decision_rate
    },
    latency: {
      avg_outbox_latency_ms: evidence.latency.avg_outbox_latency_ms,
      avg_ioe_age_hours:     evidence.latency.avg_ioe_age_hours
    },
    sla: {
      breached:         sla.sla_breached,
      at_risk:          sla.sla_at_risk,
      compliance_rate:  sla.sla_compliance_rate
    },
    dlq: {
      count:            evidence.outbox.dlq_count,
      utilization_pct:  evidence.dlq_utilization_pct
    },
    health: {
      status:           health.status,
      outbox_pending:   health.outbox_pending,
      outbox_failed:    health.outbox_failed
    },
    tenant: {
      count:            capacity.pilot_tenant_count,
      ioe_total:        capacity.aggregate.ioe_total,
      avg_saturation:   capacity.aggregate.avg_saturation_score
    },
    stability: {
      processing_cycles: stability.processing_cycles,
      failed_cycles:     stability.failed_cycles
    },
    captured_at: new Date().toISOString()
  };

  _trendSnapshots.push(snapshot);
  if (_trendSnapshots.length > MAX_TREND_SNAPSHOTS) {
    _trendSnapshots.shift();
  }

  return snapshot;
}

/**
 * Análise de tendências a partir de snapshots acumulados.
 * @returns {object}
 */
function getOperationalTrends() {
  const snapshots = _trendSnapshots;

  if (snapshots.length === 0) {
    return {
      ok: true,
      layer: LAYER,
      snapshot_count: 0,
      trends: null,
      message: 'NO_TREND_DATA — captureTrendSnapshot() required'
    };
  }

  const throughputValues = snapshots.map(s => s.throughput.outbox_delivered);
  const latencyValues = snapshots.map(s => s.latency.avg_outbox_latency_ms).filter(v => v != null);
  const slaValues = snapshots.map(s => s.sla.compliance_rate);
  const dlqValues = snapshots.map(s => s.dlq.count);
  const healthFailed = snapshots.map(s => s.health.outbox_failed);
  const tenantIoe = snapshots.map(s => s.tenant.ioe_total);

  return {
    ok: true,
    layer: LAYER,
    snapshot_count: snapshots.length,
    trends: {
      throughput_trend:  _computeTrendDirection(throughputValues),
      latency_trend:     latencyValues.length ? _computeTrendDirection(latencyValues) : 'UNKNOWN',
      sla_trend:         _computeTrendDirection(slaValues),
      dlq_trend:         _computeTrendDirection(dlqValues),
      health_trend:      _computeTrendDirection(healthFailed.map(v => -v)),
      tenant_trend:      _computeTrendDirection(tenantIoe)
    },
    latest: snapshots[snapshots.length - 1],
    captured_at: new Date().toISOString()
  };
}

function getTrendSnapshots(limit = 20) {
  const lim = Math.min(Math.max(parseInt(String(limit), 10) || 20, 1), MAX_TREND_SNAPSHOTS);
  return _trendSnapshots.slice(-lim);
}

function resetTrendSnapshots() {
  _trendSnapshots.length = 0;
}

module.exports = {
  captureTrendSnapshot,
  getOperationalTrends,
  getTrendSnapshots,
  resetTrendSnapshots,
  LAYER
};
