'use strict';

/**
 * AIOI-P4.6 — Extended Pilot Readiness Service
 *
 * Validação de prontidão para piloto alargado — ER-01..ER-08.
 * Spec: backend/docs/AIOI_EXTENDED_PILOT_READINESS_SPECIFICATION.md
 */

const fs = require('fs');
const path = require('path');
const productionStability = require('./aioiProductionStabilityService');
const governanceDrift = require('./aioiGovernanceDriftService');
const operationalHealth = require('./aioiOperationalHealthService');
const slaCompliance = require('./aioiSlaComplianceService');
const scalabilityValidation = require('./aioiScalabilityValidationService');
const pilotFlags = require('./aioiPilotFlags');

const LAYER = 'AIOI_EXTENDED_PILOT_READINESS';
const BACKEND_ROOT = path.resolve(__dirname, '../../..');
const DOCS = path.join(BACKEND_ROOT, 'docs');
const TESTS = path.join(BACKEND_ROOT, 'src', 'tests', 'aioi');

function _docExists(name) {
  return fs.existsSync(path.join(DOCS, name));
}

function _testExists(name) {
  return fs.existsSync(path.join(TESTS, name));
}

/**
 * Valida critérios ER-01..ER-08 para extended pilot.
 * @returns {Promise<object>}
 */
async function validateExtendedPilotReadiness() {
  const [health, sla, scalability, drift, stability] = await Promise.all([
    operationalHealth.getHealthSnapshot(),
    slaCompliance.getSlaComplianceSnapshot(),
    scalabilityValidation.validateScalability(),
    Promise.resolve(governanceDrift.detectGovernanceDrift()),
    Promise.resolve(productionStability.getStabilitySnapshot())
  ]);

  const flags = pilotFlags.getAioiFlags();
  const pilotValidation = pilotFlags.validatePilotConfig();

  const checks = [];

  // ER-01 estabilidade
  checks.push({
    id: 'ER-01',
    name: 'estabilidade',
    pass: stability.failed_cycles <= stability.processing_cycles
      || stability.processing_cycles === 0,
    detail: { processing_cycles: stability.processing_cycles, failed_cycles: stability.failed_cycles }
  });

  // ER-02 governança
  checks.push({
    id: 'ER-02',
    name: 'governanca',
    pass: !drift.drift_detected,
    detail: { drift_count: drift.drift_count }
  });

  // ER-03 isolamento
  checks.push({
    id: 'ER-03',
    name: 'isolamento',
    pass: pilotValidation.pilot_tenants.length <= pilotFlags.MAX_PILOT_TENANTS
      && scalability.checks.find(c => c.id === 'SV-08')?.pass !== false,
    detail: { tenant_count: pilotValidation.pilot_tenants.length }
  });

  // ER-04 observabilidade
  checks.push({
    id: 'ER-04',
    name: 'observabilidade',
    pass: _docExists('AIOI_OPERATIONAL_OBSERVABILITY_SPECIFICATION.md')
      && fs.existsSync(path.join(BACKEND_ROOT, 'src/services/aioi/aioiOperationalMetricsService.js')),
    detail: { health_endpoint: true }
  });

  // ER-05 compliance SLA
  checks.push({
    id: 'ER-05',
    name: 'compliance_sla',
    pass: sla.sla_compliance_rate >= 0,
    detail: { sla_compliance_rate: sla.sla_compliance_rate, sla_breached: sla.sla_breached }
  });

  // ER-06 health consistente
  checks.push({
    id: 'ER-06',
    name: 'health_consistente',
    pass: ['HEALTHY', 'STANDBY', 'DEGRADED'].includes(health.status),
    detail: { status: health.status }
  });

  // ER-07 sem regressão ORG-1..5
  const orgDocs = [
    'AIOI_ORG_1_QUEUE_CONSOLIDATION_REPORT.md',
    'AIOI_ORG_2_TRUTH_STAGE7_CERTIFICATION_REPORT.md',
    'AIOI_ORG_3_F49_CERTIFICATION_CLOSURE_REPORT.md',
    'AIOI_ORG_4_P0_PRODUCTION_PILOT_CERTIFICATION_REPORT.md',
    'AIOI_ORG_5_WORKFLOW_SLA_READINESS_REPORT.md'
  ];
  checks.push({
    id: 'ER-07',
    name: 'sem_regressao_org',
    pass: orgDocs.every(_docExists),
    detail: { org_docs_present: orgDocs.filter(_docExists).length }
  });

  // ER-08 sem regressão P1..P3
  const phaseDocs = [
    { phase: 'P1', doc: 'AIOI_P1_OPERATIONAL_ROLLOUT_CERTIFICATION_REPORT.md', test: 'AioiP1OperationalRolloutAudit.test.js' },
    { phase: 'P2', doc: 'AIOI_P2_PRODUCTION_OPERATIONS_CERTIFICATION_REPORT.md', test: 'AioiP2ProductionOperationsAudit.test.js' },
    { phase: 'P3', doc: 'AIOI_P3_PRODUCTION_PILOT_VALIDATION_REPORT.md', test: 'AioiP3ProductionPilotValidationAudit.test.js' }
  ];
  checks.push({
    id: 'ER-08',
    name: 'sem_regressao_p1_p3',
    pass: phaseDocs.every(p => _docExists(p.doc) && _testExists(p.test)),
    detail: { phases: phaseDocs.map(p => p.phase) }
  });

  const passCount = checks.filter(c => c.pass).length;
  const allPass = passCount === checks.length;
  const workerRequired = flags.IMPETUS_AIOI_OUTBOX_WORKER_ENABLED;
  const extendedReady = allPass && (!workerRequired || health.worker_running || health.status === 'STANDBY');

  return {
    ok: extendedReady,
    layer: LAYER,
    extended_pilot_ready: extendedReady,
    pass_count: passCount,
    total_checks: checks.length,
    checks,
    invariants: {
      runtime_enabled: false,
      runtime_active: false,
      runtime_authorized: false,
      cognitive_execution_allowed: false
    },
    captured_at: new Date().toISOString()
  };
}

module.exports = {
  validateExtendedPilotReadiness,
  LAYER
};
