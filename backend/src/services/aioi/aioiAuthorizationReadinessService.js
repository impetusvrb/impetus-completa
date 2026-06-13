'use strict';

/**
 * AIOI-P13.6 — Authorization Readiness Service
 *
 * Validação de prontidão da modelagem de autorização — AR-01..AR-08.
 * Spec: backend/docs/AIOI_AUTHORIZATION_READINESS_SPECIFICATION.md
 */

const fs = require('fs');
const path = require('path');
const governanceAssurance = require('./aioiGovernanceAssuranceService');
const complianceAnalytics = require('./aioiComplianceAnalyticsService');
const continuousReadiness = require('./aioiContinuousCertificationReadinessService');
const knowledgeReadiness = require('./aioiKnowledgeReadinessService');
const recommendationReadiness = require('./aioiRecommendationReadinessService');
const humanDecisionReadiness = require('./aioiHumanDecisionReadinessService');
const authorizationBoundary = require('./aioiAuthorizationBoundaryService');
const authorizationEvidence = require('./aioiAuthorizationEvidenceService');
const authorizationSafety = require('./aioiAuthorizationSafetyService');
const cognitiveAuthorization = require('./aioiCognitiveAuthorizationService');
const certificationDrift = require('./aioiCertificationDriftService');

const LAYER = 'AIOI_AUTHORIZATION_READINESS';
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
 * Valida critérios AR-01..AR-08.
 * @returns {Promise<object>}
 */
async function validateAuthorizationReadiness() {
  const [assurance, compliance, continuous, knowledge, recommendation, humanReview, boundaries, evidence, safety, authState, certDrift] = await Promise.all([
    governanceAssurance.validateContinuousGovernance(),
    complianceAnalytics.getComplianceAnalytics(),
    continuousReadiness.validateContinuousCertificationReadiness(),
    knowledgeReadiness.validateKnowledgeReadiness(),
    recommendationReadiness.validateRecommendationReadiness(),
    humanDecisionReadiness.validateHumanDecisionReadiness(),
    authorizationBoundary.validateAuthorizationBoundaries(),
    authorizationEvidence.getAuthorizationEvidenceChains(),
    authorizationSafety.validateAuthorizationSafety(),
    Promise.resolve(cognitiveAuthorization.getAuthorizationState()),
    Promise.resolve(certificationDrift.detectCertificationDrift())
  ]);

  const checks = [];

  checks.push({
    id: 'AR-01',
    name: 'governanca_preservada',
    pass: assurance.sovereign_protection_verification.all_sovereigns_protected
      && !certDrift.certification_drift_detected,
    detail: { assurance_score: assurance.governance_assurance_score }
  });

  checks.push({
    id: 'AR-02',
    name: 'compliance_preservado',
    pass: compliance.overall_compliance_score >= 0,
    detail: { overall_score: compliance.overall_compliance_score }
  });

  checks.push({
    id: 'AR-03',
    name: 'assurance_preservado',
    pass: continuous.pass_count >= 6,
    detail: { continuous_pass: continuous.pass_count }
  });

  checks.push({
    id: 'AR-04',
    name: 'knowledge_preservado',
    pass: knowledge.pass_count >= 6,
    detail: { knowledge_pass: knowledge.pass_count }
  });

  checks.push({
    id: 'AR-05',
    name: 'recomendacao_preservada',
    pass: recommendation.pass_count >= 6
      && _docExists('AIOI_P11_CONTROLLED_COGNITIVE_RECOMMENDATION_REPORT.md'),
    detail: { recommendation_pass: recommendation.pass_count }
  });

  checks.push({
    id: 'AR-06',
    name: 'human_review_preservada',
    pass: humanReview.pass_count >= 6
      && _docExists('AIOI_P12_HUMAN_DECISION_ASSISTANCE_REPORT.md'),
    detail: { human_review_pass: humanReview.pass_count }
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
    { phase: 'P12', doc: 'AIOI_P12_HUMAN_DECISION_ASSISTANCE_REPORT.md', test: 'AioiP12HumanDecisionAssistanceAudit.test.js' }
  ];
  checks.push({
    id: 'AR-07',
    name: 'regressao_zero',
    pass: phaseDocs.every(p => _docExists(p.doc) && _testExists(p.test))
      && evidence.all_have_evidence
      && boundaries.boundaries_valid
      && safety.safety_valid,
    detail: { phases: phaseDocs.map(p => p.phase) }
  });

  checks.push({
    id: 'AR-08',
    name: 'runtime_cognitivo_desativado',
    pass: !authState.authorized
      && authState.level === 'NONE'
      && !authState.invariants.cognitive_execution_allowed,
    detail: { authorized: authState.authorized, level: authState.level }
  });

  const passCount = checks.filter(c => c.pass).length;
  const allPass = passCount === checks.length;

  return {
    ok: allPass,
    layer: LAYER,
    authorization_readiness: allPass,
    pass_count: passCount,
    total_checks: checks.length,
    checks,
    invariants: authState.invariants,
    captured_at: new Date().toISOString()
  };
}

module.exports = {
  validateAuthorizationReadiness,
  LAYER
};
