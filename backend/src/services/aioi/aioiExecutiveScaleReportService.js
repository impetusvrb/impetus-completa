'use strict';

/**
 * AIOI-P4.5 — Executive Scale Report Service
 *
 * Relatório executivo de escala multi-tenant — read only.
 */

const tenantCapacity = require('./aioiTenantCapacityService');
const scalabilityValidation = require('./aioiScalabilityValidationService');
const governanceDrift = require('./aioiGovernanceDriftService');
const operationalTrends = require('./aioiOperationalTrendService');
const pilotFlags = require('./aioiPilotFlags');

const LAYER = 'AIOI_EXECUTIVE_SCALE_REPORT';

/**
 * Gera relatório executivo de escala.
 * @returns {Promise<object>}
 */
async function generateExecutiveScaleReport() {
  await operationalTrends.captureTrendSnapshot();

  const [capacity, scalability, drift, trends] = await Promise.all([
    tenantCapacity.getTenantCapacitySnapshot(),
    scalabilityValidation.validateScalability(),
    Promise.resolve(governanceDrift.detectGovernanceDrift()),
    Promise.resolve(operationalTrends.getOperationalTrends())
  ]);

  const flags = pilotFlags.getAioiFlags();
  const pilotValidation = pilotFlags.validatePilotConfig();

  const capacitySummary = {
    pilot_tenant_count:     capacity.pilot_tenant_count,
    aggregate_ioe_total:    capacity.aggregate.ioe_total,
    aggregate_queue_volume: capacity.aggregate.queue_volume,
    avg_saturation_score:   capacity.aggregate.avg_saturation_score,
    sla_pressure_total:     capacity.aggregate.sla_pressure_total
  };

  const scalabilitySummary = {
    validated:    scalability.validated,
    pass_count:   scalability.pass_count,
    total_checks: scalability.total_checks,
    checks:       scalability.checks.map(c => ({ id: c.id, pass: c.pass }))
  };

  const governanceDriftSummary = {
    drift_detected: drift.drift_detected,
    drift_count:    drift.drift_count,
    domains:        drift.domains.map(d => ({
      domain: d.domain,
      pass:   d.pass
    }))
  };

  const operationalTrendsSummary = {
    snapshot_count: trends.snapshot_count,
    trends:         trends.trends
  };

  const tenantGrowthSummary = {
    tenants: capacity.tenants.map(t => ({
      company_id:        t.company_id,
      ioe_total:         t.tenant_throughput?.ioe_total,
      growth_rate_24h:   t.tenant_growth_metrics?.growth_rate_24h_pct,
      saturation_level:  t.tenant_operational_saturation?.level
    }))
  };

  const scaleReadiness = scalability.validated
    && !drift.drift_detected
    && pilotValidation.ok;

  const executiveScaleReadinessSummary = {
    scale_ready:           scaleReadiness,
    aioi_enabled:          flags.IMPETUS_AIOI_ENABLED,
    queue_active:          flags.IMPETUS_AIOI_QUEUE_ACTIVE,
    worker_enabled:        flags.IMPETUS_AIOI_OUTBOX_WORKER_ENABLED,
    pilot_tenant_count:    pilotValidation.pilot_tenants.length,
    scalability_validated: scalability.validated,
    governance_aligned:    !drift.drift_detected,
    readiness_status:      scaleReadiness ? 'READY_FOR_ENTERPRISE_EXPANSION' : 'PILOT_SCALE_REVIEW'
  };

  return {
    ok: true,
    layer: LAYER,
    capacity_summary:                  capacitySummary,
    scalability_summary:               scalabilitySummary,
    governance_drift_summary:            governanceDriftSummary,
    operational_trends_summary:          operationalTrendsSummary,
    tenant_growth_summary:               tenantGrowthSummary,
    executive_scale_readiness_summary:   executiveScaleReadinessSummary,
    generated_at: new Date().toISOString()
  };
}

module.exports = {
  generateExecutiveScaleReport,
  LAYER
};
