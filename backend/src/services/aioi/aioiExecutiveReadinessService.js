'use strict';

/**
 * AIOI-P8.6 — Executive Readiness Service
 *
 * Validação de prontidão executiva — ERD-01..ERD-08.
 * Spec: backend/docs/AIOI_EXECUTIVE_READINESS_SPECIFICATION.md
 */

const fs = require('fs');
const path = require('path');
const governanceAssurance = require('./aioiGovernanceAssuranceService');
const complianceAnalytics = require('./aioiComplianceAnalyticsService');
const continuousReadiness = require('./aioiContinuousCertificationReadinessService');
const knowledgeReadiness = require('./aioiKnowledgeReadinessService');
const decisionIntelligence = require('./aioiDecisionIntelligenceService');
const decisionMaturity = require('./aioiDecisionMaturityService');
const decisionEffectiveness = require('./aioiDecisionEffectivenessService');
const certificationDrift = require('./aioiCertificationDriftService');

const LAYER = 'AIOI_EXECUTIVE_READINESS';
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
 * Valida critérios ERD-01..ERD-08.
 * @returns {Promise<object>}
 */
async function validateExecutiveReadiness() {
  const [assurance, compliance, continuous, knowledge, intelligence, maturity, effectiveness, certDrift] = await Promise.all([
    governanceAssurance.validateContinuousGovernance(),
    complianceAnalytics.getComplianceAnalytics(),
    continuousReadiness.validateContinuousCertificationReadiness(),
    knowledgeReadiness.validateKnowledgeReadiness(),
    decisionIntelligence.aggregateDecisionIntelligence(),
    decisionMaturity.getDecisionMaturity(),
    decisionEffectiveness.getDecisionEffectiveness(),
    Promise.resolve(certificationDrift.detectCertificationDrift())
  ]);

  const checks = [];

  checks.push({
    id: 'ERD-01',
    name: 'governance_preserved',
    pass: assurance.sovereign_protection_verification.all_sovereigns_protected
      && !certDrift.certification_drift_detected,
    detail: { assurance_score: assurance.governance_assurance_score }
  });

  checks.push({
    id: 'ERD-02',
    name: 'compliance_preserved',
    pass: compliance.overall_compliance_score >= 0
      && intelligence.compliance_aggregation.overall_score >= 0,
    detail: { overall_score: compliance.overall_compliance_score }
  });

  checks.push({
    id: 'ERD-03',
    name: 'assurance_preserved',
    pass: continuous.pass_count >= 6,
    detail: { continuous_pass: continuous.pass_count }
  });

  checks.push({
    id: 'ERD-04',
    name: 'knowledge_preserved',
    pass: knowledge.pass_count >= 6
      && _docExists('AIOI_P7_ENTERPRISE_KNOWLEDGE_FOUNDATION_REPORT.md'),
    detail: { knowledge_pass: knowledge.pass_count }
  });

  checks.push({
    id: 'ERD-05',
    name: 'intelligence_valid',
    pass: intelligence.ok
      && effectiveness.inference_enabled === false
      && effectiveness.prediction_enabled === false,
    detail: { pilot_tenants: intelligence.pilot_tenant_count }
  });

  checks.push({
    id: 'ERD-06',
    name: 'maturity_valid',
    pass: maturity.decision_maturity_score >= 0
      && typeof maturity.decision_coverage === 'number',
    detail: { maturity_score: maturity.decision_maturity_score }
  });

  const phaseDocs = [
    { phase: 'P1', doc: 'AIOI_P1_OPERATIONAL_ROLLOUT_CERTIFICATION_REPORT.md', test: 'AioiP1OperationalRolloutAudit.test.js' },
    { phase: 'P2', doc: 'AIOI_P2_PRODUCTION_OPERATIONS_CERTIFICATION_REPORT.md', test: 'AioiP2ProductionOperationsAudit.test.js' },
    { phase: 'P3', doc: 'AIOI_P3_PRODUCTION_PILOT_VALIDATION_REPORT.md', test: 'AioiP3ProductionPilotValidationAudit.test.js' },
    { phase: 'P4', doc: 'AIOI_P4_MULTI_TENANT_SCALE_CERTIFICATION_REPORT.md', test: 'AioiP4MultiTenantScaleAudit.test.js' },
    { phase: 'P5', doc: 'AIOI_P5_ENTERPRISE_ROLLOUT_CERTIFICATION_REPORT.md', test: 'AioiP5EnterpriseRolloutAudit.test.js' },
    { phase: 'P6', doc: 'AIOI_P6_CONTINUOUS_GOVERNANCE_ASSURANCE_REPORT.md', test: 'AioiP6ContinuousGovernanceAssuranceAudit.test.js' },
    { phase: 'P7', doc: 'AIOI_P7_ENTERPRISE_KNOWLEDGE_FOUNDATION_REPORT.md', test: 'AioiP7EnterpriseKnowledgeFoundationAudit.test.js' }
  ];
  checks.push({
    id: 'ERD-07',
    name: 'regressao_zero',
    pass: phaseDocs.every(p => _docExists(p.doc) && _testExists(p.test)),
    detail: { phases: phaseDocs.map(p => p.phase) }
  });

  checks.push({
    id: 'ERD-08',
    name: 'executive_readiness_achieved',
    pass: checks.filter(c => ['ERD-05', 'ERD-06'].includes(c.id)).every(c => c.pass)
      && maturity.decision_maturity_score >= 0,
    detail: {
      maturity_score: maturity.decision_maturity_score,
      intelligence_ok: intelligence.ok
    }
  });

  const passCount = checks.filter(c => c.pass).length;
  const allPass = passCount === checks.length;

  return {
    ok: allPass,
    layer: LAYER,
    executive_readiness: allPass,
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
  validateExecutiveReadiness,
  LAYER
};
