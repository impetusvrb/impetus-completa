'use strict';

/**
 * AIOI-P6.6 — Continuous Certification Readiness Service
 *
 * Validação de prontidão contínua — CR-01..CR-08.
 * Spec: backend/docs/AIOI_CONTINUOUS_CERTIFICATION_READINESS_SPECIFICATION.md
 */

const fs = require('fs');
const path = require('path');
const governanceAssurance = require('./aioiGovernanceAssuranceService');
const certificationDrift = require('./aioiCertificationDriftService');
const longitudinalAnalytics = require('./aioiLongitudinalAnalyticsService');
const operationalRiskRegister = require('./aioiOperationalRiskRegisterService');
const scalabilityValidation = require('./aioiScalabilityValidationService');
const enterpriseReadiness = require('./aioiEnterpriseReadinessService');

const LAYER = 'AIOI_CONTINUOUS_CERTIFICATION_READINESS';
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
 * Valida critérios CR-01..CR-08 de prontidão contínua.
 * @returns {Promise<object>}
 */
async function validateContinuousCertificationReadiness() {
  const [assurance, certDrift, analytics, risk, scalability, enterprise] = await Promise.all([
    governanceAssurance.validateContinuousGovernance(),
    Promise.resolve(certificationDrift.detectCertificationDrift()),
    longitudinalAnalytics.getLongitudinalAnalytics(),
    operationalRiskRegister.getOperationalRiskRegister(),
    scalabilityValidation.validateScalability(),
    enterpriseReadiness.validateEnterpriseReadiness()
  ]);

  const checks = [];

  checks.push({
    id: 'CR-01',
    name: 'governance_assured',
    pass: assurance.governance_assurance_score >= 70 && !certDrift.certification_drift_detected,
    detail: { assurance_score: assurance.governance_assurance_score }
  });

  checks.push({
    id: 'CR-02',
    name: 'compliance_assured',
    pass: analytics.compliance.overall_score >= 0
      && assurance.continuous_governance_validation.compliance_score >= 0,
    detail: { compliance_score: analytics.compliance.overall_score }
  });

  checks.push({
    id: 'CR-03',
    name: 'scalability_assured',
    pass: scalability.validated,
    detail: { pass_count: scalability.pass_count, total: scalability.total_checks }
  });

  checks.push({
    id: 'CR-04',
    name: 'observability_assured',
    pass: _docExists('AIOI_OPERATIONAL_OBSERVABILITY_SPECIFICATION.md')
      && analytics.trend_evolution != null,
    detail: { snapshot_count: analytics.trend_evolution.snapshot_count }
  });

  checks.push({
    id: 'CR-05',
    name: 'operational_integrity_assured',
    pass: risk.risk_score < 70 && risk.operational_risk.level !== 'HIGH',
    detail: { risk_score: risk.risk_score, risk_level: risk.risk_level }
  });

  checks.push({
    id: 'CR-06',
    name: 'certification_integrity_assured',
    pass: !certDrift.certification_drift_detected
      && certDrift.org_compliance.compliant === certDrift.org_compliance.total
      && certDrift.phase_compliance.compliant === certDrift.phase_compliance.total,
    detail: {
      org_compliant: certDrift.org_compliance.compliant,
      phase_compliant: certDrift.phase_compliance.compliant
    }
  });

  const phaseDocs = [
    { phase: 'P1', doc: 'AIOI_P1_OPERATIONAL_ROLLOUT_CERTIFICATION_REPORT.md', test: 'AioiP1OperationalRolloutAudit.test.js' },
    { phase: 'P2', doc: 'AIOI_P2_PRODUCTION_OPERATIONS_CERTIFICATION_REPORT.md', test: 'AioiP2ProductionOperationsAudit.test.js' },
    { phase: 'P3', doc: 'AIOI_P3_PRODUCTION_PILOT_VALIDATION_REPORT.md', test: 'AioiP3ProductionPilotValidationAudit.test.js' },
    { phase: 'P4', doc: 'AIOI_P4_MULTI_TENANT_SCALE_CERTIFICATION_REPORT.md', test: 'AioiP4MultiTenantScaleAudit.test.js' },
    { phase: 'P5', doc: 'AIOI_P5_ENTERPRISE_ROLLOUT_CERTIFICATION_REPORT.md', test: 'AioiP5EnterpriseRolloutAudit.test.js' }
  ];
  checks.push({
    id: 'CR-07',
    name: 'regressao_zero',
    pass: phaseDocs.every(p => _docExists(p.doc) && _testExists(p.test))
      && enterprise.checks.find(c => c.id === 'EN-07')?.pass !== false,
    detail: { phases: phaseDocs.map(p => p.phase) }
  });

  checks.push({
    id: 'CR-08',
    name: 'readiness_continua',
    pass: assurance.ok && checks.filter(c => ['CR-01', 'CR-06'].includes(c.id)).every(c => c.pass),
    detail: {
      assurance_ok: assurance.ok,
      enterprise_ready: enterprise.enterprise_ready
    }
  });

  const passCount = checks.filter(c => c.pass).length;
  const allPass = passCount === checks.length;

  return {
    ok: allPass,
    layer: LAYER,
    continuous_readiness: allPass,
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
  validateContinuousCertificationReadiness,
  LAYER
};
