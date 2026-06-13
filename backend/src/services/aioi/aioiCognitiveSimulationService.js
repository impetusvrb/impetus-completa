'use strict';

/**
 * AIOI-P14.1 — Cognitive Simulation Service
 *
 * Simulações hipotéticas controladas — sem efeitos operacionais reais.
 * Spec: backend/docs/AIOI_COGNITIVE_SIMULATION_SPECIFICATION.md
 */

const crypto = require('crypto');
const observationCatalog = require('./aioiObservationCatalogService');
const recommendationCatalog = require('./aioiRecommendationCatalogService');
const decisionReviewCatalog = require('./aioiDecisionReviewCatalogService');
const authorizationCatalog = require('./aioiAuthorizationCatalogService');

const LAYER = 'AIOI_COGNITIVE_SIMULATION';

const SIMULATION_CATEGORIES = [
  'workflow', 'decision', 'sla', 'risk', 'capacity', 'governance', 'compliance'
];

const SIMULATION_SCOPE = 'ISOLATED_HYPOTHETICAL';

function _simulationId(category, index) {
  const hash = crypto.createHash('sha256')
    .update(`SIM:${category}:${index}:${new Date().toISOString().slice(0, 10)}`)
    .digest('hex')
    .slice(0, 16);
  return `SIM-${category.toUpperCase()}-${hash}`;
}

function _scenarioDescription(category) {
  return `Simulação isolada e reversível de cenário hipotético em ${category}. Sem efeito operacional, sem autorização, sem alteração de estado.`;
}

function _simulatedOutcomes(category, obsCount, recCount, reviewCount, modelCount) {
  return {
    projected_human_review:     'pending',
    projected_authorization:    'denied',
    state_mutation:             false,
    workflow_mutation:          false,
    compliance_mutation:        false,
    sla_mutation:               false,
    sovereign_mutation:         false,
    reversible:                 true,
    isolated:                   true,
    input_artifact_counts: {
      observations:  obsCount,
      recommendations: recCount,
      reviews:       reviewCount,
      auth_models:   modelCount
    },
    category
  };
}

/**
 * Gera simulações hipotéticas controladas — READ ONLY.
 * @returns {Promise<object>}
 */
async function generateControlledSimulations() {
  const [observations, recommendations, reviews, authModels] = await Promise.all([
    observationCatalog.getObservationCatalog(),
    recommendationCatalog.getRecommendationCatalog(),
    decisionReviewCatalog.getDecisionReviewCatalog(),
    authorizationCatalog.getAuthorizationCatalog()
  ]);

  const simulations = SIMULATION_CATEGORIES.map((category, index) => {
    const obsItems = observations.catalog[category] || [];
    const recItems = recommendations.catalog[category] || [];
    const reviewItems = reviews.catalog[category] || [];
    const modelItems = authModels.catalog[category] || [];

    return {
      simulation_id:        _simulationId(category, index),
      category,
      scenario_description: _scenarioDescription(category),
      simulated_inputs: {
        source_observations:      obsItems.map(o => o.observation_id),
        source_recommendations:   recItems.map(r => r.recommendation_id),
        source_reviews:           reviewItems.map(r => r.assistance_id),
        source_models:            modelItems.map(m => m.authorization_model_id)
      },
      simulated_outcomes:   _simulatedOutcomes(
        category, obsItems.length, recItems.length, reviewItems.length, modelItems.length
      ),
      simulation_scope:     SIMULATION_SCOPE,
      is_execution:         false,
      is_decision:          false,
      is_authorized:        false,
      produces_real_effects: false,
      generated_at:         new Date().toISOString()
    };
  });

  return {
    ok: true,
    layer: LAYER,
    simulations,
    simulation_count: simulations.length,
    all_isolated: simulations.every(s => s.simulation_scope === SIMULATION_SCOPE),
    no_real_effects: simulations.every(s => s.produces_real_effects === false),
    captured_at: new Date().toISOString()
  };
}

module.exports = {
  generateControlledSimulations,
  SIMULATION_CATEGORIES,
  SIMULATION_SCOPE,
  LAYER
};
