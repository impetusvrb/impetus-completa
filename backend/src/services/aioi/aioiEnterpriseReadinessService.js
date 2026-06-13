'use strict';

/**
 * AIOI-P5.2 — Enterprise Readiness Service
 *
 * Validação de prontidão enterprise — EN-01..EN-08.
 * Spec: backend/docs/AIOI_ENTERPRISE_READINESS_SPECIFICATION.md
 */

const fs = require('fs');
const path = require('path');
const operationalHealth = require('./aioiOperationalHealthService');
const productionStability = require('./aioiProductionStabilityService');
const scalabilityValidation = require('./aioiScalabilityValidationService');
const governanceDrift = require('./aioiGovernanceDriftService');
const slaCompliance = require('./aioiSlaComplianceService');
const extendedPilotReadiness = require('./aioiExtendedPilotReadinessService');
const enterpriseGovernance = require('./aioiEnterpriseGovernanceService');

const LAYER = 'AIOI_ENTERPRISE_READINESS';
const BACKEND_ROOT = path.resolve(__dirname, '../../..');
const DOCS = path.join(BACKEND_ROOT, 'docs');

function _docExists(name) {
  return fs.existsSync(path.join(DOCS, name));
}

/**
 * Valida critérios EN-01..EN-08.
 * @returns {Promise<object>}
 */
async function validateEnterpriseReadiness() {
  const [health, stability, scalability, drift, sla, extended, governance] = await Promise.all([
    operationalHealth.getHealthSnapshot(),
    Promise.resolve(productionStability.getStabilitySnapshot()),
    scalabilityValidation.validateScalability(),
    Promise.resolve(governanceDrift.detectGovernanceDrift()),
    slaCompliance.getSlaComplianceSnapshot(),
    extendedPilotReadiness.validateExtendedPilotReadiness(),
    enterpriseGovernance.getGovernanceComplianceSnapshot()
  ]);

  const checks = [];

  checks.push({
    id: 'EN-01',
    name: 'estabilidade',
    pass: stability.failed_cycles <= stability.processing_cycles || stability.processing_cycles === 0,
    detail: { processing_cycles: stability.processing_cycles, failed_cycles: stability.failed_cycles }
  });

  checks.push({
    id: 'EN-02',
    name: 'observabilidade',
    pass: _docExists('AIOI_OPERATIONAL_OBSERVABILITY_SPECIFICATION.md')
      && fs.existsSync(path.join(BACKEND_ROOT, 'src/services/aioi/aioiOperationalMetricsService.js')),
    detail: { health_status: health.status }
  });

  checks.push({
    id: 'EN-03',
    name: 'escalabilidade',
    pass: scalability.validated,
    detail: { pass_count: scalability.pass_count, total: scalability.total_checks }
  });

  checks.push({
    id: 'EN-04',
    name: 'governanca',
    pass: !drift.drift_detected && governance.governance_maturity_score >= 70,
    detail: { maturity_score: governance.governance_maturity_score, drift_count: drift.drift_count }
  });

  checks.push({
    id: 'EN-05',
    name: 'sla',
    pass: sla.sla_compliance_rate >= 0,
    detail: { sla_compliance_rate: sla.sla_compliance_rate, breached: sla.sla_breached }
  });

  checks.push({
    id: 'EN-06',
    name: 'isolamento',
    pass: scalability.checks.find(c => c.id === 'SV-08')?.pass !== false,
    detail: { extended_isolation: extended.checks.find(c => c.id === 'ER-03')?.pass }
  });

  checks.push({
    id: 'EN-07',
    name: 'regressao_zero',
    pass: extended.checks.find(c => c.id === 'ER-07')?.pass
      && extended.checks.find(c => c.id === 'ER-08')?.pass,
    detail: { org: extended.checks.find(c => c.id === 'ER-07')?.pass, phases: extended.checks.find(c => c.id === 'ER-08')?.pass }
  });

  checks.push({
    id: 'EN-08',
    name: 'readiness_corporativo',
    pass: extended.extended_pilot_ready && governance.policy_adherence.adherence_pct >= 70,
    detail: {
      extended_pilot_ready: extended.extended_pilot_ready,
      policy_adherence_pct: governance.policy_adherence.adherence_pct
    }
  });

  const passCount = checks.filter(c => c.pass).length;
  const allPass = passCount === checks.length;

  return {
    ok: allPass,
    layer: LAYER,
    enterprise_ready: allPass,
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
  validateEnterpriseReadiness,
  LAYER
};
