'use strict';

/**
 * AIOI-P15.1 — Cognitive Runtime Validation Service
 *
 * Validação estrutural de futuro runtime cognitivo — sem runtime real.
 * Spec: backend/docs/AIOI_COGNITIVE_RUNTIME_VALIDATION_SPECIFICATION.md
 */

const crypto = require('crypto');
const governanceAssurance = require('./aioiGovernanceAssuranceService');
const complianceAnalytics = require('./aioiComplianceAnalyticsService');
const continuousReadiness = require('./aioiContinuousCertificationReadinessService');
const knowledgeReadiness = require('./aioiKnowledgeReadinessService');
const observationReadiness = require('./aioiObservationReadinessService');
const recommendationReadiness = require('./aioiRecommendationReadinessService');
const humanDecisionReadiness = require('./aioiHumanDecisionReadinessService');
const authorizationReadiness = require('./aioiAuthorizationReadinessService');
const simulationReadiness = require('./aioiSimulationReadinessService');
const cognitiveAuthorization = require('./aioiCognitiveAuthorizationService');

const LAYER = 'AIOI_COGNITIVE_RUNTIME_VALIDATION';

const VALIDATION_CATEGORIES = [
  'governance', 'compliance', 'assurance', 'knowledge', 'observation',
  'recommendation', 'human_review', 'authorization', 'simulation'
];

function _validationId(category, index) {
  const hash = crypto.createHash('sha256')
    .update(`RTV:${category}:${index}:${new Date().toISOString().slice(0, 10)}`)
    .digest('hex')
    .slice(0, 16);
  return `RTV-${category.toUpperCase().replace('_', '-')}-${hash}`;
}

function _baseRequirements(category) {
  return [
    'human_sovereign_approval_required',
    'governance_assurance_verified',
    'boundary_checks_passed',
    'safety_checks_passed',
    `${category}_layer_certified`
  ];
}

function _baseConstraints() {
  return {
    runtime_enabled:             false,
    runtime_active:              false,
    runtime_authorized:            false,
    cognitive_execution_allowed: false,
    state_mutation_allowed:      false,
    workflow_mutation_allowed:   false,
    compliance_mutation_allowed: false,
    sovereign_mutation_allowed:  false
  };
}

function _baseRisks(category) {
  return [
    { risk_id: 'RISK-UNAUTHORIZED-RUNTIME', severity: 'CRITICAL', mitigated: true },
    { risk_id: 'RISK-SOVEREIGN-OVERRIDE', severity: 'CRITICAL', mitigated: true },
    { risk_id: `RISK-${category.toUpperCase()}-DRIFT`, severity: 'HIGH', mitigated: true }
  ];
}

function _buildValidation(category, index, deps, layerPass) {
  return {
    validation_id:        _validationId(category, index),
    category,
    runtime_requirements: _baseRequirements(category),
    runtime_constraints:  _baseConstraints(),
    runtime_dependencies: deps,
    runtime_risks:        _baseRisks(category),
    runtime_possible:     false,
    is_runtime:           false,
    is_execution:         false,
    is_authorized:        false,
    layer_pass:           layerPass,
    generated_at:         new Date().toISOString()
  };
}

/**
 * Avalia requisitos estruturais de futuro runtime cognitivo — READ ONLY.
 * @returns {Promise<object>}
 */
async function generateRuntimeValidation() {
  const [
    assurance, compliance, continuous, knowledge, observation,
    recommendation, humanReview, authorization, simulation, authState
  ] = await Promise.all([
    governanceAssurance.validateContinuousGovernance(),
    complianceAnalytics.getComplianceAnalytics(),
    continuousReadiness.validateContinuousCertificationReadiness(),
    knowledgeReadiness.validateKnowledgeReadiness(),
    observationReadiness.validateObservationReadiness(),
    recommendationReadiness.validateRecommendationReadiness(),
    humanDecisionReadiness.validateHumanDecisionReadiness(),
    authorizationReadiness.validateAuthorizationReadiness(),
    simulationReadiness.validateSimulationReadiness(),
    Promise.resolve(cognitiveAuthorization.getAuthorizationState())
  ]);

  const validations = [
    _buildValidation('governance', 0, [
      { layer: 'P6', service: 'aioiGovernanceAssuranceService', field: 'governance_assurance_score' },
      { layer: 'P9', service: 'aioiCognitiveAuthorizationService', field: 'authorized' }
    ], assurance.sovereign_protection_verification.all_sovereigns_protected),
    _buildValidation('compliance', 1, [
      { layer: 'P6', service: 'aioiComplianceAnalyticsService', field: 'overall_compliance_score' }
    ], compliance.overall_compliance_score >= 0),
    _buildValidation('assurance', 2, [
      { layer: 'P6', service: 'aioiContinuousCertificationReadinessService', field: 'pass_count' }
    ], continuous.pass_count >= 6),
    _buildValidation('knowledge', 3, [
      { layer: 'P7', service: 'aioiKnowledgeReadinessService', field: 'pass_count' }
    ], knowledge.pass_count >= 6),
    _buildValidation('observation', 4, [
      { layer: 'P10', service: 'aioiObservationReadinessService', field: 'pass_count' }
    ], observation.pass_count >= 6),
    _buildValidation('recommendation', 5, [
      { layer: 'P11', service: 'aioiRecommendationReadinessService', field: 'pass_count' }
    ], recommendation.pass_count >= 6),
    _buildValidation('human_review', 6, [
      { layer: 'P12', service: 'aioiHumanDecisionReadinessService', field: 'pass_count' }
    ], humanReview.pass_count >= 6),
    _buildValidation('authorization', 7, [
      { layer: 'P13', service: 'aioiAuthorizationReadinessService', field: 'pass_count' }
    ], authorization.pass_count >= 6),
    _buildValidation('simulation', 8, [
      { layer: 'P14', service: 'aioiSimulationReadinessService', field: 'pass_count' }
    ], simulation.pass_count >= 6)
  ];

  return {
    ok: true,
    layer: LAYER,
    validations,
    validation_count: validations.length,
    all_runtime_denied: validations.every(v => v.runtime_possible === false),
    invariants: authState.invariants,
    validation_only: true,
    captured_at: new Date().toISOString()
  };
}

module.exports = {
  generateRuntimeValidation,
  VALIDATION_CATEGORIES,
  LAYER
};
