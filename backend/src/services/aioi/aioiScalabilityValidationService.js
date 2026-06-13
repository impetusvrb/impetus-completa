'use strict';

/**
 * AIOI-P4.2 — Scalability Validation Service
 *
 * Validação de escalabilidade operacional — observação only.
 * Contract: backend/docs/AIOI_SCALABILITY_VALIDATION_CONTRACT.md
 */

const pilotFlags = require('./aioiPilotFlags');
const tenantCapacity = require('./aioiTenantCapacityService');
const operationalEvidence = require('./aioiOperationalEvidenceService');
const operationalHealth = require('./aioiOperationalHealthService');
const productionStability = require('./aioiProductionStabilityService');

const LAYER = 'AIOI_SCALABILITY_VALIDATION';

const DLQ_CONTAINMENT_MAX_PCT = 10;
const SLA_STABILITY_MIN_COMPLIANCE = 70;

/**
 * Executa validação de escalabilidade (SV-01..SV-08).
 * @returns {Promise<object>}
 */
async function validateScalability() {
  const [capacity, evidence, health, stability] = await Promise.all([
    tenantCapacity.getTenantCapacitySnapshot(),
    operationalEvidence.collectOperationalEvidence(),
    operationalHealth.getHealthSnapshot(),
    Promise.resolve(productionStability.getStabilitySnapshot())
  ]);

  const outboxWorker = require('./aioiOutboxWorkerService');
  const workerStatus = outboxWorker.getWorkerStatus();
  const flags = pilotFlags.getAioiFlags();
  const tenants = pilotFlags.getPilotTenants();

  const checks = [];

  // SV-01 throughput scaling
  const throughputOk = evidence.throughput.outbox_delivered > 0
    || evidence.pipeline.ioe_total === 0
    || !flags.IMPETUS_AIOI_ENABLED;
  checks.push({
    id: 'SV-01',
    name: 'throughput_scaling',
    pass: throughputOk,
    detail: { outbox_delivered: evidence.throughput.outbox_delivered, ioe_total: evidence.pipeline.ioe_total }
  });

  // SV-02 worker scaling
  const workerOk = !flags.IMPETUS_AIOI_OUTBOX_WORKER_ENABLED
    || workerStatus.worker_running
    || tenants.length === 0;
  checks.push({
    id: 'SV-02',
    name: 'worker_scaling',
    pass: workerOk,
    detail: { worker_running: workerStatus.worker_running, run_count: workerStatus.run_count }
  });

  // SV-03 queue growth tolerance
  const queueGrowthOk = capacity.aggregate.queue_volume < 10000
    || evidence.outbox.pending < 500;
  checks.push({
    id: 'SV-03',
    name: 'queue_growth_tolerance',
    pass: queueGrowthOk,
    detail: { queue_volume: capacity.aggregate.queue_volume, pending: evidence.outbox.pending }
  });

  // SV-04 outbox growth tolerance
  const outboxGrowthOk = evidence.error_rate_pct <= DLQ_CONTAINMENT_MAX_PCT * 2;
  checks.push({
    id: 'SV-04',
    name: 'outbox_growth_tolerance',
    pass: outboxGrowthOk,
    detail: { error_rate_pct: evidence.error_rate_pct, dlq_count: evidence.outbox.dlq_count }
  });

  // SV-05 SLA stability under load
  const slaCompliance = evidence.sla_compliance;
  const slaTotal = (slaCompliance.breached || 0) + (slaCompliance.at_risk || 0);
  const slaOk = slaTotal === 0 || capacity.aggregate.ioe_total === 0
    || ((capacity.aggregate.ioe_total - slaTotal) / capacity.aggregate.ioe_total * 100) >= SLA_STABILITY_MIN_COMPLIANCE;
  checks.push({
    id: 'SV-05',
    name: 'sla_stability_under_load',
    pass: slaOk,
    detail: { sla_pressure: slaTotal, ioe_total: capacity.aggregate.ioe_total }
  });

  // SV-06 health stability
  const healthOk = ['HEALTHY', 'STANDBY'].includes(health.status);
  checks.push({
    id: 'SV-06',
    name: 'health_stability',
    pass: healthOk,
    detail: { status: health.status }
  });

  // SV-07 DLQ containment
  const dlqOk = evidence.dlq_utilization_pct <= DLQ_CONTAINMENT_MAX_PCT
    || evidence.outbox.dlq_count === 0;
  checks.push({
    id: 'SV-07',
    name: 'dlq_containment',
    pass: dlqOk,
    detail: { dlq_utilization_pct: evidence.dlq_utilization_pct, dlq_count: evidence.outbox.dlq_count }
  });

  // SV-08 tenant isolation preserved
  const isolationOk = tenants.every((t) => pilotFlags.isPilotTenant(t))
    && capacity.tenants.every((tc) => !tc.error);
  checks.push({
    id: 'SV-08',
    name: 'tenant_isolation_preserved',
    pass: isolationOk,
    detail: { pilot_tenant_count: tenants.length }
  });

  const passCount = checks.filter((c) => c.pass).length;
  const allPass = passCount === checks.length;

  return {
    ok: allPass,
    layer: LAYER,
    validated: allPass,
    pass_count: passCount,
    total_checks: checks.length,
    checks,
    stability: {
      processing_cycles: stability.processing_cycles,
      failed_cycles: stability.failed_cycles,
      restart_count: stability.restart_count
    },
    captured_at: new Date().toISOString()
  };
}

module.exports = {
  validateScalability,
  LAYER,
  DLQ_CONTAINMENT_MAX_PCT,
  SLA_STABILITY_MIN_COMPLIANCE
};
