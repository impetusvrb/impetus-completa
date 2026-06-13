'use strict';

/**
 * AIOI-P15.3 — Runtime Validation Evidence Service
 *
 * Rastreabilidade de validações de runtime — READ ONLY.
 * Spec: backend/docs/AIOI_RUNTIME_VALIDATION_EVIDENCE_SPECIFICATION.md
 */

const cognitiveRuntimeValidation = require('./aioiCognitiveRuntimeValidationService');
const humanReviewEvidence = require('./aioiHumanReviewEvidenceService');
const authorizationEvidence = require('./aioiAuthorizationEvidenceService');
const simulationEvidence = require('./aioiSimulationEvidenceService');
const decisionReviewCatalog = require('./aioiDecisionReviewCatalogService');
const authorizationCatalog = require('./aioiAuthorizationCatalogService');
const simulationCatalog = require('./aioiSimulationCatalogService');

const LAYER = 'AIOI_RUNTIME_VALIDATION_EVIDENCE';

const PHASE_REPORTS = [
  'AIOI_P12_HUMAN_DECISION_ASSISTANCE_REPORT.md',
  'AIOI_P13_COGNITIVE_AUTHORIZATION_MODELING_REPORT.md',
  'AIOI_P14_CONTROLLED_COGNITIVE_SIMULATION_REPORT.md'
];

function _allReviewIds(catalog) {
  return Object.values(catalog.catalog).flat().map(r => r.assistance_id);
}

function _allModelIds(catalog) {
  return Object.values(catalog.catalog).flat().map(m => m.authorization_model_id);
}

function _allSimulationIds(catalog) {
  return Object.values(catalog.catalog).flat().map(s => s.simulation_id);
}

function _isReviewTraceable(id, evidence) {
  return evidence.chains.some(c => c.assistance_id === id && c.traceability_status === 'TRACEABLE');
}

function _isModelTraceable(id, evidence) {
  return evidence.chains.some(c => c.authorization_model_id === id && c.traceability_status === 'TRACEABLE');
}

function _isSimulationTraceable(id, evidence) {
  return evidence.chains.some(c => c.simulation_id === id && c.traceability_status === 'TRACEABLE');
}

/**
 * Cadeias de evidência para todas as validações de runtime.
 * @returns {Promise<object>}
 */
async function getRuntimeValidationEvidenceChains() {
  const [validations, reviewEvidence, modelEvidence, simEvidence, reviews, models, simulations] = await Promise.all([
    cognitiveRuntimeValidation.generateRuntimeValidation(),
    humanReviewEvidence.getHumanReviewEvidenceChains(),
    authorizationEvidence.getAuthorizationEvidenceChains(),
    simulationEvidence.getSimulationEvidenceChains(),
    decisionReviewCatalog.getDecisionReviewCatalog(),
    authorizationCatalog.getAuthorizationCatalog(),
    simulationCatalog.getSimulationCatalog()
  ]);

  const allReviews = _allReviewIds(reviews);
  const allModels = _allModelIds(models);
  const allSimulations = _allSimulationIds(simulations);

  const chains = validations.validations.map(val => {
    const sourceReviews = allReviews.slice(0, 3);
    const sourceModels = allModels.slice(0, 3);
    const sourceSimulations = allSimulations.slice(0, 3);

    const evidenceChain = [
      ...val.runtime_dependencies.map(d => ({
        link_type: 'layer_dependency',
        source:    d.service,
        field:     d.field,
        layer:     d.layer
      })),
      ...sourceReviews.map(id => ({
        link_type: 'human_review_ref',
        source:    'aioiHumanDecisionAssistanceService',
        field:     id
      })),
      ...sourceModels.map(id => ({
        link_type: 'auth_model_ref',
        source:    'aioiCognitiveAuthorizationModelingService',
        field:     id
      })),
      ...sourceSimulations.map(id => ({
        link_type: 'simulation_ref',
        source:    'aioiCognitiveSimulationService',
        field:     id
      })),
      ...PHASE_REPORTS.map(doc => ({
        link_type: 'phase_certification',
        source:    doc,
        field:     'certification_pass'
      }))
    ];

    const reviewsTraceable = sourceReviews.every(id => _isReviewTraceable(id, reviewEvidence));
    const modelsTraceable = sourceModels.every(id => _isModelTraceable(id, modelEvidence));
    const simsTraceable = sourceSimulations.every(id => _isSimulationTraceable(id, simEvidence));

    const traceabilityStatus = evidenceChain.length > 0 && reviewsTraceable && modelsTraceable && simsTraceable
      ? 'TRACEABLE'
      : 'MISSING_EVIDENCE';

    return {
      validation_id:       val.validation_id,
      evidence_chain:      evidenceChain,
      source_reviews:      sourceReviews,
      source_models:       sourceModels,
      source_simulations:  sourceSimulations,
      traceability_status: traceabilityStatus,
      evidence_count:      evidenceChain.length
    };
  });

  const allTraceable = chains.every(c => c.traceability_status === 'TRACEABLE');

  return {
    ok: allTraceable,
    layer: LAYER,
    chains,
    total_validations: chains.length,
    traceable_count: chains.filter(c => c.traceability_status === 'TRACEABLE').length,
    all_have_evidence: allTraceable,
    captured_at: new Date().toISOString()
  };
}

module.exports = {
  getRuntimeValidationEvidenceChains,
  LAYER
};
