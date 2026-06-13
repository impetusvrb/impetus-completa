'use strict';

/**
 * AIOI-P13.3 — Authorization Evidence Service
 *
 * Rastreabilidade de modelos de autorização — READ ONLY.
 * Spec: backend/docs/AIOI_AUTHORIZATION_EVIDENCE_SPECIFICATION.md
 */

const cognitiveAuthorizationModeling = require('./aioiCognitiveAuthorizationModelingService');
const humanReviewEvidence = require('./aioiHumanReviewEvidenceService');
const recommendationEvidence = require('./aioiRecommendationEvidenceService');
const decisionReviewCatalog = require('./aioiDecisionReviewCatalogService');
const recommendationCatalog = require('./aioiRecommendationCatalogService');

const LAYER = 'AIOI_AUTHORIZATION_EVIDENCE';

const PHASE_REPORTS = [
  'AIOI_P11_CONTROLLED_COGNITIVE_RECOMMENDATION_REPORT.md',
  'AIOI_P12_HUMAN_DECISION_ASSISTANCE_REPORT.md'
];

function _reviewIdsForCategory(catalog, category) {
  return (catalog.catalog[category] || []).map(r => r.assistance_id);
}

function _recommendationIdsForCategory(catalog, category) {
  return (catalog.catalog[category] || []).map(r => r.recommendation_id);
}

function _isReviewTraceable(reviewId, reviewEvidence) {
  return reviewEvidence.chains.some(
    c => c.assistance_id === reviewId && c.traceability_status === 'TRACEABLE'
  );
}

function _isRecommendationTraceable(recId, recEvidence) {
  return recEvidence.chains.some(
    c => c.recommendation_id === recId && c.traceability_status === 'TRACEABLE'
  );
}

/**
 * Cadeias de evidência para todos os modelos de autorização.
 * @returns {Promise<object>}
 */
async function getAuthorizationEvidenceChains() {
  const [models, reviewEvidence, recEvidence, reviews, recommendations] = await Promise.all([
    cognitiveAuthorizationModeling.generateAuthorizationModels(),
    humanReviewEvidence.getHumanReviewEvidenceChains(),
    recommendationEvidence.getRecommendationEvidenceChains(),
    decisionReviewCatalog.getDecisionReviewCatalog(),
    recommendationCatalog.getRecommendationCatalog()
  ]);

  const chains = models.models.map(model => {
    const supportingReviews = _reviewIdsForCategory(reviews, model.category);
    const supportingRecommendations = _recommendationIdsForCategory(recommendations, model.category);

    const evidenceChain = [
      ...supportingReviews.map(id => ({
        link_type: 'human_review_ref',
        source:    'aioiHumanDecisionAssistanceService',
        field:     id
      })),
      ...supportingRecommendations.map(id => ({
        link_type: 'recommendation_ref',
        source:    'aioiCognitiveRecommendationService',
        field:     id
      })),
      ...PHASE_REPORTS.map(doc => ({
        link_type: 'phase_certification',
        source:    doc,
        field:     'certification_pass'
      }))
    ];

    const reviewsTraceable = supportingReviews.every(id =>
      _isReviewTraceable(id, reviewEvidence)
    );
    const recsTraceable = supportingRecommendations.every(id =>
      _isRecommendationTraceable(id, recEvidence)
    );

    const traceabilityStatus = evidenceChain.length > 0 && reviewsTraceable && recsTraceable
      ? 'TRACEABLE'
      : 'MISSING_EVIDENCE';

    return {
      authorization_model_id:    model.authorization_model_id,
      evidence_chain:          evidenceChain,
      supporting_reviews:      supportingReviews,
      supporting_recommendations: supportingRecommendations,
      traceability_status:     traceabilityStatus,
      evidence_count:          evidenceChain.length
    };
  });

  const allTraceable = chains.every(c => c.traceability_status === 'TRACEABLE');

  return {
    ok: allTraceable,
    layer: LAYER,
    chains,
    total_models: chains.length,
    traceable_count: chains.filter(c => c.traceability_status === 'TRACEABLE').length,
    all_have_evidence: allTraceable,
    captured_at: new Date().toISOString()
  };
}

module.exports = {
  getAuthorizationEvidenceChains,
  LAYER
};
