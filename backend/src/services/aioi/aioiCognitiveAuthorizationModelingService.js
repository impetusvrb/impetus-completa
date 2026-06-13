'use strict';

/**
 * AIOI-P13.1 — Cognitive Authorization Modeling Service
 *
 * Modelagem formal de autorização cognitiva futura — sem autorização real.
 * Spec: backend/docs/AIOI_COGNITIVE_AUTHORIZATION_MODELING_SPECIFICATION.md
 */

const crypto = require('crypto');
const decisionReviewCatalog = require('./aioiDecisionReviewCatalogService');
const recommendationCatalog = require('./aioiRecommendationCatalogService');
const cognitiveAuthorization = require('./aioiCognitiveAuthorizationService');

const LAYER = 'AIOI_COGNITIVE_AUTHORIZATION_MODELING';

const MODEL_CATEGORIES = [
  'workflow', 'decision', 'sla', 'risk', 'capacity', 'governance', 'compliance'
];

const LEVEL_BY_CATEGORY = {
  workflow:   'ASSISTED_DECISION',
  decision:   'ASSISTED_DECISION',
  sla:        'OBSERVATION',
  risk:       'RECOMMENDATION',
  capacity:   'OBSERVATION',
  governance: 'NONE',
  compliance: 'RECOMMENDATION'
};

function _modelId(category, index) {
  const hash = crypto.createHash('sha256')
    .update(`AUTH-MODEL:${category}:${index}:${new Date().toISOString().slice(0, 10)}`)
    .digest('hex')
    .slice(0, 16);
  return `AUTH-MODEL-${category.toUpperCase()}-${hash}`;
}

function _requiredControls(category) {
  const base = [
    'human_sovereign_approval',
    'governance_assurance_validated',
    'boundary_checks_passed',
    'safety_checks_passed'
  ];
  if (category === 'compliance') base.push('compliance_snapshot_verified');
  if (category === 'governance') base.push('sovereign_protection_verified');
  if (category === 'sla') base.push('sla_snapshot_verified');
  if (category === 'risk') base.push('risk_register_verified');
  return base;
}

function _requiredApprovals(category) {
  const base = ['operational_lead', 'compliance_officer'];
  if (category === 'governance' || category === 'decision') {
    return [...base, 'executive_review'];
  }
  return base;
}

/**
 * Modela cenários formais de autorização cognitiva futura — READ ONLY.
 * @returns {Promise<object>}
 */
async function generateAuthorizationModels() {
  const [reviews, recommendations, authState] = await Promise.all([
    decisionReviewCatalog.getDecisionReviewCatalog(),
    recommendationCatalog.getRecommendationCatalog(),
    Promise.resolve(cognitiveAuthorization.getAuthorizationState())
  ]);

  const models = MODEL_CATEGORIES.map((category, index) => {
    const reviewItems = reviews.catalog[category] || [];
    const recItems = recommendations.catalog[category] || [];

    return {
      authorization_model_id: _modelId(category, index),
      category,
      requested_level:        LEVEL_BY_CATEGORY[category] || 'NONE',
      required_controls:      _requiredControls(category),
      required_approvals:     _requiredApprovals(category),
      authorization_possible: false,
      is_authorized:          false,
      is_decision:            false,
      is_execution:           false,
      supporting_review_count: reviewItems.length,
      supporting_recommendation_count: recItems.length,
      current_auth_level:     authState.level,
      generated_at:           new Date().toISOString()
    };
  });

  return {
    ok: true,
    layer: LAYER,
    models,
    model_count: models.length,
    all_authorization_denied: models.every(m => m.authorization_possible === false),
    modeling_only: true,
    captured_at: new Date().toISOString()
  };
}

module.exports = {
  generateAuthorizationModels,
  MODEL_CATEGORIES,
  LAYER
};
