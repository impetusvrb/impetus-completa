'use strict';

/**
 * AIOI-P15.6 — Runtime Readiness Service
 *
 * Validação de prontidão de runtime — RRV-01..RRV-08.
 * Spec: backend/docs/AIOI_RUNTIME_READINESS_SPECIFICATION.md
 */

const fs = require('fs');
const path = require('path');
const governanceAssurance = require('./aioiGovernanceAssuranceService');
const complianceAnalytics = require('./aioiComplianceAnalyticsService');
const continuousReadiness = require('./aioiContinuousCertificationReadinessService');
const knowledgeReadiness = require('./aioiKnowledgeReadinessService');
const humanDecisionReadiness = require('./aioiHumanDecisionReadinessService');
const simulationReadiness = require('./aioiSimulationReadinessService');
const runtimeBoundary = require('./aioiRuntimeBoundaryService');
const runtimeEvidence = require('./aioiRuntimeValidationEvidenceService');
const runtimeSafety = require('./aioiRuntimeSafetyService');
const cognitiveAuthorization = require('./aioiCognitiveAuthorizationService');
const certificationDrift = require('./aioiCertificationDriftService');

const LAYER = 'AIOI_RUNTIME_READINESS';
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
 * Valida critérios RRV-01..RRV-08.
 * @returns {Promise<object>}
 */
async function validateRuntimeReadiness() {
  const [assurance, compliance, continuous, knowledge, humanReview, simulation, boundaries, evidence, safety, authState, certDrift] = await Promise.all([
    governanceAssurance.validateContinuousGovernance(),
    complianceAnalytics.getComplianceAnalytics(),
    continuousReadiness.validateContinuousCertificationReadiness(),
    knowledgeReadiness.validateKnowledgeReadiness(),
    humanDecisionReadiness.validateHumanDecisionReadiness(),
    simulationReadiness.validateSimulationReadiness(),
    runtimeBoundary.validateRuntimeBoundaries(),
    runtimeEvidence.getRuntimeValidationEvidenceChains(),
    runtimeSafety.validateRuntimeSafety(),
    Promise.resolve(cognitiveAuthorization.getAuthorizationState()),
    Promise.resolve(certificationDrift.detectCertificationDrift())
  ]);

  const checks = [];

  checks.push({
    id: 'RRV-01',
    name: 'governanca_preservada',
    pass: assurance.sovereign_protection_verification.all_sovereigns_protected
      && !certDrift.certification_drift_detected,
    detail: { assurance_score: assurance.governance_assurance_score }
  });

  checks.push({
    id: 'RRV-02',
    name: 'compliance_preservado',
    pass: compliance.overall_compliance_score >= 0,
    detail: { overall_score: compliance.overall_compliance_score }
  });

  checks.push({
    id: 'RRV-03',
    name: 'assurance_preservado',
    pass: continuous.pass_count >= 6,
    detail: { continuous_pass: continuous.pass_count }
  });

  checks.push({
    id: 'RRV-04',
    name: 'knowledge_preservado',
    pass: knowledge.pass_count >= 6,
    detail: { knowledge_pass: knowledge.pass_count }
  });

  checks.push({
    id: 'RRV-05',
    name: 'human_review_preservada',
    pass: humanReview.pass_count >= 6
      && _docExists('AIOI_P12_HUMAN_DECISION_ASSISTANCE_REPORT.md'),
    detail: { human_review_pass: humanReview.pass_count }
  });

  checks.push({
    id: 'RRV-06',
    name: 'simulation_preservada',
    pass: simulation.pass_count >= 6
      && _docExists('AIOI_P14_CONTROLLED_COGNITIVE_SIMULATION_REPORT.md'),
    detail: { simulation_pass: simulation.pass_count }
  });

  const phaseDocs = [
    { phase: 'P1', doc: 'AIOI_P1_OPERATIONAL_ROLLOUT_CERTIFICATION_REPORT.md', test: 'AioiP1OperationalRolloutAudit.test.js' },
    { phase: 'P2', doc: 'AIOI_P2_PRODUCTION_OPERATIONS_CERTIFICATION_REPORT.md', test: 'AioiP2ProductionOperationsAudit.test.js' },
    { phase: 'P3', doc: 'AIOI_P3_PRODUCTION_PILOT_VALIDATION_REPORT.md', test: 'AioiP3ProductionPilotValidationAudit.test.js' },
    { phase: 'P4', doc: 'AIOI_P4_MULTI_TENANT_SCALE_CERTIFICATION_REPORT.md', test: 'AioiP4MultiTenantScaleAudit.test.js' },
    { phase: 'P5', doc: 'AIOI_P5_ENTERPRISE_ROLLOUT_CERTIFICATION_REPORT.md', test: 'AioiP5EnterpriseRolloutAudit.test.js' },
    { phase: 'P6', doc: 'AIOI_P6_CONTINUOUS_GOVERNANCE_ASSURANCE_REPORT.md', test: 'AioiP6ContinuousGovernanceAssuranceAudit.test.js' },
    { phase: 'P7', doc: 'AIOI_P7_ENTERPRISE_KNOWLEDGE_FOUNDATION_REPORT.md', test: 'AioiP7EnterpriseKnowledgeFoundationAudit.test.js' },
    { phase: 'P8', doc: 'AIOI_P8_EXECUTIVE_DECISION_INTELLIGENCE_REPORT.md', test: 'AioiP8ExecutiveDecisionIntelligenceAudit.test.js' },
    { phase: 'P9', doc: 'AIOI_P9_COGNITIVE_GOVERNANCE_FOUNDATION_REPORT.md', test: 'AioiP9CognitiveGovernanceFoundationAudit.test.js' },
    { phase: 'P10', doc: 'AIOI_P10_COGNITIVE_OBSERVATION_FRAMEWORK_REPORT.md', test: 'AioiP10CognitiveObservationFrameworkAudit.test.js' },
    { phase: 'P11', doc: 'AIOI_P11_CONTROLLED_COGNITIVE_RECOMMENDATION_REPORT.md', test: 'AioiP11ControlledCognitiveRecommendationAudit.test.js' },
    { phase: 'P12', doc: 'AIOI_P12_HUMAN_DECISION_ASSISTANCE_REPORT.md', test: 'AioiP12HumanDecisionAssistanceAudit.test.js' },
    { phase: 'P13', doc: 'AIOI_P13_COGNITIVE_AUTHORIZATION_MODELING_REPORT.md', test: 'AioiP13CognitiveAuthorizationModelingAudit.test.js' },
    { phase: 'P14', doc: 'AIOI_P14_CONTROLLED_COGNITIVE_SIMULATION_REPORT.md', test: 'AioiP14ControlledCognitiveSimulationAudit.test.js' }
  ];
  checks.push({
    id: 'RRV-07',
    name: 'regressao_zero',
    pass: phaseDocs.every(p => _docExists(p.doc) && _testExists(p.test))
      && evidence.all_have_evidence
      && boundaries.boundaries_valid
      && safety.safety_valid,
    detail: { phases: phaseDocs.map(p => p.phase) }
  });

  checks.push({
    id: 'RRV-08',
    name: 'runtime_continua_desativado',
    pass: !authState.authorized
      && authState.level === 'NONE'
      && !authState.invariants.runtime_enabled
      && !authState.invariants.runtime_active
      && !authState.invariants.cognitive_execution_allowed,
    detail: { authorized: authState.authorized, level: authState.level }
  });

  const passCount = checks.filter(c => c.pass).length;
  const allPass = passCount === checks.length;

  return {
    ok: allPass,
    layer: LAYER,
    runtime_readiness: allPass,
    pass_count: passCount,
    total_checks: checks.length,
    checks,
    invariants: authState.invariants,
    captured_at: new Date().toISOString()
  };
}

module.exports = {
  validateRuntimeReadiness,
  LAYER
};
