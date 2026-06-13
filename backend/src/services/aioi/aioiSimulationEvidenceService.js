'use strict';

/**
 * AIOI-P14.3 — Simulation Evidence Service
 *
 * Rastreabilidade de simulações — READ ONLY.
 * Spec: backend/docs/AIOI_SIMULATION_EVIDENCE_SPECIFICATION.md
 */

const cognitiveSimulation = require('./aioiCognitiveSimulationService');
const observationEvidence = require('./aioiObservationEvidenceService');
const recommendationEvidence = require('./aioiRecommendationEvidenceService');
const humanReviewEvidence = require('./aioiHumanReviewEvidenceService');
const authorizationEvidence = require('./aioiAuthorizationEvidenceService');
const observationCatalog = require('./aioiObservationCatalogService');

const LAYER = 'AIOI_SIMULATION_EVIDENCE';

const PHASE_REPORTS = [
  'AIOI_P10_COGNITIVE_OBSERVATION_FRAMEWORK_REPORT.md',
  'AIOI_P11_CONTROLLED_COGNITIVE_RECOMMENDATION_REPORT.md',
  'AIOI_P12_HUMAN_DECISION_ASSISTANCE_REPORT.md',
  'AIOI_P13_COGNITIVE_AUTHORIZATION_MODELING_REPORT.md'
];

function _isObservationTraceable(obsId, obsEvidence, catalogObservations) {
  const inEvidence = obsEvidence.chains.some(
    c => c.observation_id === obsId && c.traceability_status === 'TRACEABLE'
  );
  if (inEvidence) return true;
  const inCatalog = catalogObservations.find(o => o.observation_id === obsId);
  return Boolean(inCatalog?.evidence_sources?.length > 0);
}

function _isRecommendationTraceable(recId, recEvidence) {
  return recEvidence.chains.some(
    c => c.recommendation_id === recId && c.traceability_status === 'TRACEABLE'
  );
}

function _isReviewTraceable(reviewId, reviewEvidence) {
  return reviewEvidence.chains.some(
    c => c.assistance_id === reviewId && c.traceability_status === 'TRACEABLE'
  );
}

function _isModelTraceable(modelId, modelEvidence) {
  return modelEvidence.chains.some(
    c => c.authorization_model_id === modelId && c.traceability_status === 'TRACEABLE'
  );
}

/**
 * Cadeias de evidência para todas as simulações.
 * @returns {Promise<object>}
 */
async function getSimulationEvidenceChains() {
  const [simResult, obsEvidence, recEvidence, reviewEvidence, modelEvidence, obsCatalog] = await Promise.all([
    cognitiveSimulation.generateControlledSimulations(),
    observationEvidence.getObservationEvidenceChains(),
    recommendationEvidence.getRecommendationEvidenceChains(),
    humanReviewEvidence.getHumanReviewEvidenceChains(),
    authorizationEvidence.getAuthorizationEvidenceChains(),
    observationCatalog.getObservationCatalog()
  ]);

  const catalogObservations = Object.values(obsCatalog.catalog).flat();

  const chains = simResult.simulations.map(sim => {
    const sourceObservations = sim.simulated_inputs.source_observations || [];
    const sourceRecommendations = sim.simulated_inputs.source_recommendations || [];
    const sourceReviews = sim.simulated_inputs.source_reviews || [];
    const sourceModels = sim.simulated_inputs.source_models || [];

    const evidenceChain = [
      ...sourceObservations.map(id => ({
        link_type: 'observation_ref',
        source:    'aioiCognitiveObservationService',
        field:     id
      })),
      ...sourceRecommendations.map(id => ({
        link_type: 'recommendation_ref',
        source:    'aioiCognitiveRecommendationService',
        field:     id
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
      ...PHASE_REPORTS.map(doc => ({
        link_type: 'phase_certification',
        source:    doc,
        field:     'certification_pass'
      }))
    ];

    const obsTraceable = sourceObservations.every(id =>
      _isObservationTraceable(id, obsEvidence, catalogObservations)
    );
    const recTraceable = sourceRecommendations.every(id =>
      _isRecommendationTraceable(id, recEvidence)
    );
    const reviewTraceable = sourceReviews.every(id =>
      _isReviewTraceable(id, reviewEvidence)
    );
    const modelTraceable = sourceModels.every(id =>
      _isModelTraceable(id, modelEvidence)
    );

    const traceabilityStatus = evidenceChain.length > 0
      && obsTraceable && recTraceable && reviewTraceable && modelTraceable
      ? 'TRACEABLE'
      : 'MISSING_EVIDENCE';

    return {
      simulation_id:           sim.simulation_id,
      evidence_chain:          evidenceChain,
      source_observations:     sourceObservations,
      source_recommendations:  sourceRecommendations,
      source_reviews:          sourceReviews,
      source_models:           sourceModels,
      traceability_status:     traceabilityStatus,
      evidence_count:          evidenceChain.length
    };
  });

  const allTraceable = chains.every(c => c.traceability_status === 'TRACEABLE');

  return {
    ok: allTraceable,
    layer: LAYER,
    chains,
    total_simulations: chains.length,
    traceable_count: chains.filter(c => c.traceability_status === 'TRACEABLE').length,
    all_have_evidence: allTraceable,
    captured_at: new Date().toISOString()
  };
}

module.exports = {
  getSimulationEvidenceChains,
  LAYER
};
