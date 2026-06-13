'use strict';

/**
 * AIOI-P12.2 — Decision Review Catalog Service
 *
 * Catálogo de pacotes de revisão humana — READ ONLY.
 * Spec: backend/docs/AIOI_DECISION_REVIEW_CATALOG_SPECIFICATION.md
 */

const humanDecisionAssistance = require('./aioiHumanDecisionAssistanceService');

const LAYER = 'AIOI_DECISION_REVIEW_CATALOG';

const CATALOG_CATEGORIES = [
  'workflow', 'decision', 'sla', 'risk', 'capacity', 'governance', 'compliance'
];

/**
 * Catálogo completo de revisões humanas.
 * @returns {Promise<object>}
 */
async function getDecisionReviewCatalog() {
  const result = await humanDecisionAssistance.generateHumanDecisionAssistance();

  const catalog = {};
  for (const cat of CATALOG_CATEGORIES) {
    catalog[cat] = result.packages.filter(p => p.category === cat);
  }

  return {
    ok: true,
    layer: LAYER,
    categories: CATALOG_CATEGORIES,
    catalog,
    total_packages: result.package_count,
    all_review_required: result.all_review_required,
    human_in_the_loop: result.human_in_the_loop,
    captured_at: new Date().toISOString()
  };
}

/**
 * Pacotes de revisão filtrados por categoria.
 * @param {string} category
 * @returns {Promise<object>}
 */
async function getReviewsByCategory(category) {
  const full = await getDecisionReviewCatalog();
  const normalized = String(category || '').toLowerCase();
  const items = full.catalog[normalized] || [];

  return {
    ok: true,
    layer: LAYER,
    category: normalized,
    reviews: items,
    count: items.length,
    captured_at: new Date().toISOString()
  };
}

module.exports = {
  getDecisionReviewCatalog,
  getReviewsByCategory,
  CATALOG_CATEGORIES,
  LAYER
};
