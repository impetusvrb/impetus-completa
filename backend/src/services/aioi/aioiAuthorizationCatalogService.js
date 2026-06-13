'use strict';

/**
 * AIOI-P13.2 — Authorization Catalog Service
 *
 * Catálogo de modelos de autorização — READ ONLY.
 * Spec: backend/docs/AIOI_AUTHORIZATION_CATALOG_SPECIFICATION.md
 */

const cognitiveAuthorizationModeling = require('./aioiCognitiveAuthorizationModelingService');

const LAYER = 'AIOI_AUTHORIZATION_CATALOG';

const CATALOG_CATEGORIES = [
  'workflow', 'decision', 'sla', 'risk', 'capacity', 'governance', 'compliance'
];

/**
 * Catálogo completo de modelos de autorização.
 * @returns {Promise<object>}
 */
async function getAuthorizationCatalog() {
  const result = await cognitiveAuthorizationModeling.generateAuthorizationModels();

  const catalog = {};
  for (const cat of CATALOG_CATEGORIES) {
    catalog[cat] = result.models.filter(m => m.category === cat);
  }

  return {
    ok: true,
    layer: LAYER,
    categories: CATALOG_CATEGORIES,
    catalog,
    total_models: result.model_count,
    all_authorization_denied: result.all_authorization_denied,
    modeling_only: result.modeling_only,
    captured_at: new Date().toISOString()
  };
}

/**
 * Modelos filtrados por categoria.
 * @param {string} category
 * @returns {Promise<object>}
 */
async function getAuthorizationsByCategory(category) {
  const full = await getAuthorizationCatalog();
  const normalized = String(category || '').toLowerCase();
  const items = full.catalog[normalized] || [];

  return {
    ok: true,
    layer: LAYER,
    category: normalized,
    models: items,
    count: items.length,
    captured_at: new Date().toISOString()
  };
}

module.exports = {
  getAuthorizationCatalog,
  getAuthorizationsByCategory,
  CATALOG_CATEGORIES,
  LAYER
};
