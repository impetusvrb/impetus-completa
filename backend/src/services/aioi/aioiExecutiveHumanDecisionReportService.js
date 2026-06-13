'use strict';

/**
 * AIOI-P12.7 — Executive Human Decision Report Service
 *
 * Relatório executivo de assistência decisória humana — READ ONLY.
 */

const humanDecisionAssistance = require('./aioiHumanDecisionAssistanceService');
const decisionReviewCatalog = require('./aioiDecisionReviewCatalogService');
const humanReviewEvidence = require('./aioiHumanReviewEvidenceService');
const humanAuthorityBoundary = require('./aioiHumanAuthorityBoundaryService');
const humanReviewSafety = require('./aioiHumanReviewSafetyService');
const humanDecisionReadiness = require('./aioiHumanDecisionReadinessService');
const cognitiveRecommendation = require('./aioiCognitiveRecommendationService');
const authorityRegistry = require('./aioiCognitiveAuthorityRegistryService');

const LAYER = 'AIOI_EXECUTIVE_HUMAN_DECISION_REPORT';

/**
 * Gera relatório executivo consolidado de assistência decisória humana.
 * @returns {Promise<object>}
 */
async function generateExecutiveHumanDecisionReport() {
  const [assistance, catalog, evidence, boundaries, safety, readiness, recommendations, registry] = await Promise.all([
    humanDecisionAssistance.generateHumanDecisionAssistance(),
    decisionReviewCatalog.getDecisionReviewCatalog(),
    humanReviewEvidence.getHumanReviewEvidenceChains(),
    humanAuthorityBoundary.validateHumanAuthorityBoundaries(),
    humanReviewSafety.validateHumanReviewSafety(),
    humanDecisionReadiness.validateHumanDecisionReadiness(),
    cognitiveRecommendation.generateStructuredRecommendations(),
    Promise.resolve(authorityRegistry.getCognitiveAuthorityRegistry())
  ]);

  const reviewQueue = assistance.packages.filter(p => p.review_required === true);

  return {
    ok: true,
    layer: LAYER,
    human_decision_summary: {
      total_packages:        assistance.package_count,
      categories:              assistance.packages.map(p => p.category),
      all_review_required:     assistance.all_review_required,
      human_in_the_loop:       assistance.human_in_the_loop,
      human_sovereign:         assistance.packages.every(p => p.human_sovereign === true)
    },
    review_queue_summary: {
      queue_size:          reviewQueue.length,
      pending_human_review: reviewQueue.length,
      categories_in_queue: [...new Set(reviewQueue.map(p => p.category))]
    },
    recommendation_summary: {
      total_recommendations: recommendations.recommendation_count,
      linked_to_review:      assistance.packages.reduce((s, p) => s + p.recommendations.length, 0),
      analytical_only:       recommendations.analytical_artifact_only
    },
    evidence_summary: {
      traceable_count:  evidence.traceable_count,
      total_packages:   evidence.total_packages,
      all_have_evidence: evidence.all_have_evidence
    },
    governance_summary: {
      org_protected:     registry.org_sovereigns_protected,
      protected_count:   registry.protected_domains.length,
      catalog_total:     catalog.total_packages,
      boundaries_valid:  boundaries.boundaries_valid
    },
    human_decision_readiness_summary: {
      human_decision_readiness: readiness.human_decision_readiness,
      pass_count:               readiness.pass_count,
      total_checks:             readiness.total_checks,
      safety_valid:             safety.safety_valid
    },
    generated_at: new Date().toISOString()
  };
}

module.exports = {
  generateExecutiveHumanDecisionReport,
  LAYER
};
