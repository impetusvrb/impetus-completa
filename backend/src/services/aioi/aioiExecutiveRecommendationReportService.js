'use strict';

/**
 * AIOI-P11.7 — Executive Recommendation Report Service
 *
 * Relatório executivo de recomendações cognitivas — READ ONLY.
 */

const cognitiveRecommendation = require('./aioiCognitiveRecommendationService');
const recommendationCatalog = require('./aioiRecommendationCatalogService');
const recommendationEvidence = require('./aioiRecommendationEvidenceService');
const recommendationBoundary = require('./aioiRecommendationBoundaryService');
const recommendationSafety = require('./aioiRecommendationSafetyService');
const recommendationReadiness = require('./aioiRecommendationReadinessService');
const authorityRegistry = require('./aioiCognitiveAuthorityRegistryService');

const LAYER = 'AIOI_EXECUTIVE_RECOMMENDATION_REPORT';

/**
 * Gera relatório executivo consolidado de recomendações.
 * @returns {Promise<object>}
 */
async function generateExecutiveRecommendationReport() {
  const [recommendations, catalog, evidence, boundaries, safety, readiness, registry] = await Promise.all([
    cognitiveRecommendation.generateStructuredRecommendations(),
    recommendationCatalog.getRecommendationCatalog(),
    recommendationEvidence.getRecommendationEvidenceChains(),
    recommendationBoundary.validateRecommendationBoundaries(),
    recommendationSafety.validateRecommendationSafety(),
    recommendationReadiness.validateRecommendationReadiness(),
    Promise.resolve(authorityRegistry.getCognitiveAuthorityRegistry())
  ]);

  const confidenceBreakdown = {
    LOW:    recommendations.recommendations.filter(r => r.confidence_level === 'LOW').length,
    MEDIUM: recommendations.recommendations.filter(r => r.confidence_level === 'MEDIUM').length,
    HIGH:   recommendations.recommendations.filter(r => r.confidence_level === 'HIGH').length
  };

  return {
    ok: true,
    layer: LAYER,
    recommendation_summary: {
      total_recommendations: recommendations.recommendation_count,
      categories:            recommendations.categories,
      confidence_breakdown:    confidenceBreakdown,
      analytical_artifact_only: recommendations.analytical_artifact_only
    },
    evidence_summary: {
      traceable_count:       evidence.traceable_count,
      total_recommendations: evidence.total_recommendations,
      all_have_evidence:     evidence.all_have_evidence
    },
    boundary_summary: {
      boundaries_valid: boundaries.boundaries_valid,
      pass_count:       boundaries.pass_count,
      total_checks:     boundaries.total_checks
    },
    safety_summary: {
      safety_valid: safety.safety_valid,
      pass_count:   safety.pass_count,
      total_checks: safety.total_checks
    },
    governance_summary: {
      org_protected:   registry.org_sovereigns_protected,
      protected_count: registry.protected_domains.length,
      catalog_total:   catalog.total_recommendations
    },
    recommendation_readiness_summary: {
      recommendation_readiness: readiness.recommendation_readiness,
      pass_count:               readiness.pass_count,
      total_checks:             readiness.total_checks
    },
    generated_at: new Date().toISOString()
  };
}

module.exports = {
  generateExecutiveRecommendationReport,
  LAYER
};
