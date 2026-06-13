'use strict';

/**
 * AIOI-P11.2 — Recommendation Catalog Service
 *
 * Catálogo de recomendações por domínio — READ ONLY.
 * Spec: backend/docs/AIOI_RECOMMENDATION_CATALOG_SPECIFICATION.md
 */

const cognitiveRecommendation = require('./aioiCognitiveRecommendationService');

const LAYER = 'AIOI_RECOMMENDATION_CATALOG';

const CATALOG_CATEGORIES = [
  'workflow', 'sla', 'risk', 'capacity', 'compliance', 'governance', 'decision'
];

/**
 * Catálogo completo de recomendações.
 * @returns {Promise<object>}
 */
async function getRecommendationCatalog() {
  const result = await cognitiveRecommendation.generateStructuredRecommendations();

  const catalog = {};
  for (const cat of CATALOG_CATEGORIES) {
    catalog[cat] = result.recommendations.filter(r => r.category === cat);
  }

  return {
    ok: true,
    layer: LAYER,
    categories: CATALOG_CATEGORIES,
    catalog,
    total_recommendations: result.recommendation_count,
    analytical_artifact_only: result.analytical_artifact_only,
    captured_at: new Date().toISOString()
  };
}

/**
 * Recomendações filtradas por categoria.
 * @param {string} category
 * @returns {Promise<object>}
 */
async function getRecommendationsByCategory(category) {
  const full = await getRecommendationCatalog();
  const normalized = String(category || '').toLowerCase();
  const items = full.catalog[normalized] || [];

  return {
    ok: true,
    layer: LAYER,
    category: normalized,
    recommendations: items,
    count: items.length,
    captured_at: new Date().toISOString()
  };
}

module.exports = {
  getRecommendationCatalog,
  getRecommendationsByCategory,
  CATALOG_CATEGORIES,
  LAYER
};
