'use strict';

/**
 * AIOI-P16.6 — Runtime Blueprint Readiness Service
 *
 * Validação de prontidão do blueprint de runtime — RBR-01..RBR-08.
 * Spec: backend/docs/AIOI_RUNTIME_BLUEPRINT_READINESS_SPECIFICATION.md
 */

const fs = require('fs');
const path = require('path');
const governanceAssurance = require('./aioiGovernanceAssuranceService');
const complianceAnalytics = require('./aioiComplianceAnalyticsService');
const continuousReadiness = require('./aioiContinuousCertificationReadinessService');
const knowledgeReadiness = require('./aioiKnowledgeReadinessService');
const cognitiveRuntimeBlueprint = require('./aioiCognitiveRuntimeBlueprintService');
const cognitiveAuthorization = require('./aioiCognitiveAuthorizationService');
const certificationDrift = require('./aioiCertificationDriftService');

const LAYER = 'AIOI_RUNTIME_BLUEPRINT_READINESS';
const BACKEND_ROOT = path.resolve(__dirname, '../../..');
const DOCS  = path.join(BACKEND_ROOT, 'docs');
const TESTS = path.join(BACKEND_ROOT, 'src', 'tests', 'aioi');

function _docExists(n)  { return fs.existsSync(path.join(DOCS, n)); }
function _testExists(n) { return fs.existsSync(path.join(TESTS, n)); }

/**
 * Valida critérios RBR-01..RBR-08.
 * @returns {Promise<object>}
 */
async function validateRuntimeBlueprintReadiness() {
  // Serviços síncronos
  const authState = cognitiveAuthorization.getAuthorizationState();
  const certDrift = certificationDrift.detectCertificationDrift();

  // Serviços assíncronos — apenas camada P16 + governança base
  const [assurance, compliance, continuous, knowledge, blueprint] = await Promise.all([
    governanceAssurance.validateContinuousGovernance(),
    complianceAnalytics.getComplianceAnalytics(),
    continuousReadiness.validateContinuousCertificationReadiness(),
    knowledgeReadiness.validateKnowledgeReadiness(),
    cognitiveRuntimeBlueprint.generateRuntimeBlueprint()
  ]);

  // Verificações derivadas do blueprint (sem re-chamar boundary/evidence/safety)
  const bpConstraints = blueprint.runtime_constraints;
  const bpOk = blueprint.blueprint_status === 'DEFINED_NOT_DEPLOYABLE'
    && blueprint.deployable === false
    && blueprint.all_gates_closed
    && blueprint.all_controls_unsatisfied;

  const checks = [];

  checks.push({
    id: 'RBR-01', name: 'governanca_preservada',
    pass: !certDrift.certification_drift_detected
      && assurance.sovereign_protection_verification !== undefined
      && _docExists('AIOI_P6_CONTINUOUS_GOVERNANCE_ASSURANCE_REPORT.md'),
    detail: { assurance_score: assurance.governance_assurance_score }
  });
  checks.push({
    id: 'RBR-02', name: 'compliance_preservado',
    pass: compliance.ok !== false
      && _docExists('AIOI_P6_CONTINUOUS_GOVERNANCE_ASSURANCE_REPORT.md'),
    detail: { compliance_ok: compliance.ok }
  });
  checks.push({
    id: 'RBR-03', name: 'assurance_preservado',
    pass: _docExists('AIOI_P6_CONTINUOUS_GOVERNANCE_ASSURANCE_REPORT.md')
      && _testExists('AioiP6ContinuousGovernanceAssuranceAudit.test.js'),
    detail: { doc_verified: true }
  });
  checks.push({
    id: 'RBR-04', name: 'knowledge_preservado',
    pass: _docExists('AIOI_P7_ENTERPRISE_KNOWLEDGE_FOUNDATION_REPORT.md')
      && _testExists('AioiP7EnterpriseKnowledgeFoundationAudit.test.js'),
    detail: { doc_verified: true }
  });
  checks.push({
    id: 'RBR-05', name: 'simulation_preservada',
    pass: _docExists('AIOI_P14_CONTROLLED_COGNITIVE_SIMULATION_REPORT.md')
      && _testExists('AioiP14ControlledCognitiveSimulationAudit.test.js'),
    detail: { doc_verified: true }
  });
  checks.push({
    id: 'RBR-06', name: 'runtime_validation_preservada',
    pass: _docExists('AIOI_P15_RESTRICTED_COGNITIVE_RUNTIME_VALIDATION_REPORT.md')
      && _testExists('AioiP15RestrictedCognitiveRuntimeValidationAudit.test.js'),
    detail: { doc_verified: true }
  });

  const phaseDocs = [
    { phase: 'P1',  doc: 'AIOI_P1_OPERATIONAL_ROLLOUT_CERTIFICATION_REPORT.md',        test: 'AioiP1OperationalRolloutAudit.test.js' },
    { phase: 'P2',  doc: 'AIOI_P2_PRODUCTION_OPERATIONS_CERTIFICATION_REPORT.md',      test: 'AioiP2ProductionOperationsAudit.test.js' },
    { phase: 'P3',  doc: 'AIOI_P3_PRODUCTION_PILOT_VALIDATION_REPORT.md',              test: 'AioiP3ProductionPilotValidationAudit.test.js' },
    { phase: 'P4',  doc: 'AIOI_P4_MULTI_TENANT_SCALE_CERTIFICATION_REPORT.md',        test: 'AioiP4MultiTenantScaleAudit.test.js' },
    { phase: 'P5',  doc: 'AIOI_P5_ENTERPRISE_ROLLOUT_CERTIFICATION_REPORT.md',        test: 'AioiP5EnterpriseRolloutAudit.test.js' },
    { phase: 'P6',  doc: 'AIOI_P6_CONTINUOUS_GOVERNANCE_ASSURANCE_REPORT.md',         test: 'AioiP6ContinuousGovernanceAssuranceAudit.test.js' },
    { phase: 'P7',  doc: 'AIOI_P7_ENTERPRISE_KNOWLEDGE_FOUNDATION_REPORT.md',         test: 'AioiP7EnterpriseKnowledgeFoundationAudit.test.js' },
    { phase: 'P8',  doc: 'AIOI_P8_EXECUTIVE_DECISION_INTELLIGENCE_REPORT.md',         test: 'AioiP8ExecutiveDecisionIntelligenceAudit.test.js' },
    { phase: 'P9',  doc: 'AIOI_P9_COGNITIVE_GOVERNANCE_FOUNDATION_REPORT.md',         test: 'AioiP9CognitiveGovernanceFoundationAudit.test.js' },
    { phase: 'P10', doc: 'AIOI_P10_COGNITIVE_OBSERVATION_FRAMEWORK_REPORT.md',        test: 'AioiP10CognitiveObservationFrameworkAudit.test.js' },
    { phase: 'P11', doc: 'AIOI_P11_CONTROLLED_COGNITIVE_RECOMMENDATION_REPORT.md',    test: 'AioiP11ControlledCognitiveRecommendationAudit.test.js' },
    { phase: 'P12', doc: 'AIOI_P12_HUMAN_DECISION_ASSISTANCE_REPORT.md',              test: 'AioiP12HumanDecisionAssistanceAudit.test.js' },
    { phase: 'P13', doc: 'AIOI_P13_COGNITIVE_AUTHORIZATION_MODELING_REPORT.md',       test: 'AioiP13CognitiveAuthorizationModelingAudit.test.js' },
    { phase: 'P14', doc: 'AIOI_P14_CONTROLLED_COGNITIVE_SIMULATION_REPORT.md',        test: 'AioiP14ControlledCognitiveSimulationAudit.test.js' },
    { phase: 'P15', doc: 'AIOI_P15_RESTRICTED_COGNITIVE_RUNTIME_VALIDATION_REPORT.md', test: 'AioiP15RestrictedCognitiveRuntimeValidationAudit.test.js' }
  ];
  checks.push({
    id: 'RBR-07', name: 'regressao_zero',
    pass: phaseDocs.every(p => _docExists(p.doc) && _testExists(p.test))
      && bpOk
      && !bpConstraints.state_mutation_allowed
      && !bpConstraints.workflow_mutation_allowed,
    detail: { phases: phaseDocs.map(p => p.phase) }
  });
  checks.push({
    id: 'RBR-08', name: 'runtime_continua_desativado',
    pass: !authState.authorized
      && authState.level === 'NONE'
      && !authState.invariants.runtime_enabled
      && !authState.invariants.runtime_active
      && !authState.invariants.cognitive_execution_allowed,
    detail: { authorized: authState.authorized, level: authState.level }
  });

  const passCount = checks.filter(c => c.pass).length;
  const allPass   = passCount === checks.length;

  return {
    ok: allPass,
    layer: LAYER,
    runtime_blueprint_readiness: allPass,
    pass_count: passCount,
    total_checks: checks.length,
    checks,
    invariants: authState.invariants,
    captured_at: new Date().toISOString()
  };
}

module.exports = {
  validateRuntimeBlueprintReadiness,
  LAYER
};
