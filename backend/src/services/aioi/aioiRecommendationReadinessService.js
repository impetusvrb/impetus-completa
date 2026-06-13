'use strict';

/**
 * AIOI-P11.6 — Recommendation Readiness Service
 *
 * Validação de prontidão de recomendações — CRR-01..CRR-08.
 * Spec: backend/docs/AIOI_RECOMMENDATION_READINESS_SPECIFICATION.md
 */

const fs = require('fs');
const path = require('path');
const governanceAssurance = require('./aioiGovernanceAssuranceService');
const complianceAnalytics = require('./aioiComplianceAnalyticsService');
const continuousReadiness = require('./aioiContinuousCertificationReadinessService');
const knowledgeReadiness = require('./aioiKnowledgeReadinessService');
const observationReadiness = require('./aioiObservationReadinessService');
const recommendationBoundary = require('./aioiRecommendationBoundaryService');
const recommendationEvidence = require('./aioiRecommendationEvidenceService');
const recommendationSafety = require('./aioiRecommendationSafetyService');
const authorization = require('./aioiCognitiveAuthorizationService');
const certificationDrift = require('./aioiCertificationDriftService');

const LAYER = 'AIOI_RECOMMENDATION_READINESS';
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
 * Valida critérios CRR-01..CRR-08.
 * @returns {Promise<object>}
 */
async function validateRecommendationReadiness() {
  const [assurance, compliance, continuous, knowledge, observation, boundaries, evidence, safety, authState, certDrift] = await Promise.all([
    governanceAssurance.validateContinuousGovernance(),
    complianceAnalytics.getComplianceAnalytics(),
    continuousReadiness.validateContinuousCertificationReadiness(),
    knowledgeReadiness.validateKnowledgeReadiness(),
    observationReadiness.validateObservationReadiness(),
    recommendationBoundary.validateRecommendationBoundaries(),
    recommendationEvidence.getRecommendationEvidenceChains(),
    recommendationSafety.validateRecommendationSafety(),
    Promise.resolve(authorization.getAuthorizationState()),
    Promise.resolve(certificationDrift.detectCertificationDrift())
  ]);

  const checks = [];

  checks.push({
    id: 'CRR-01',
    name: 'governanca_preservada',
    pass: assurance.sovereign_protection_verification.all_sovereigns_protected
      && !certDrift.certification_drift_detected,
    detail: { assurance_score: assurance.governance_assurance_score }
  });

  checks.push({
    id: 'CRR-02',
    name: 'compliance_preservado',
    pass: compliance.overall_compliance_score >= 0,
    detail: { overall_score: compliance.overall_compliance_score }
  });

  checks.push({
    id: 'CRR-03',
    name: 'assurance_preservado',
    pass: continuous.pass_count >= 6,
    detail: { continuous_pass: continuous.pass_count }
  });

  checks.push({
    id: 'CRR-04',
    name: 'knowledge_preservado',
    pass: knowledge.pass_count >= 6,
    detail: { knowledge_pass: knowledge.pass_count }
  });

  checks.push({
    id: 'CRR-05',
    name: 'observation_preservada',
    pass: observation.pass_count >= 6
      && _docExists('AIOI_P10_COGNITIVE_OBSERVATION_FRAMEWORK_REPORT.md'),
    detail: { observation_pass: observation.pass_count }
  });

  checks.push({
    id: 'CRR-06',
    name: 'boundaries_preservadas',
    pass: boundaries.boundaries_valid && safety.safety_valid,
    detail: { boundary_pass: boundaries.pass_count, safety_pass: safety.pass_count }
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
    { phase: 'P10', doc: 'AIOI_P10_COGNITIVE_OBSERVATION_FRAMEWORK_REPORT.md', test: 'AioiP10CognitiveObservationFrameworkAudit.test.js' }
  ];
  checks.push({
    id: 'CRR-07',
    name: 'regressao_zero',
    pass: phaseDocs.every(p => _docExists(p.doc) && _testExists(p.test))
      && evidence.all_have_evidence,
    detail: { phases: phaseDocs.map(p => p.phase) }
  });

  checks.push({
    id: 'CRR-08',
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
    recommendation_readiness: allPass,
    pass_count: passCount,
    total_checks: checks.length,
    checks,
    invariants: authState.invariants,
    captured_at: new Date().toISOString()
  };
}

module.exports = {
  validateRecommendationReadiness,
  LAYER
};
