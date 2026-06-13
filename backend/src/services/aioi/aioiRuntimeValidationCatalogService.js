'use strict';

/**
 * AIOI-P15.2 — Runtime Validation Catalog Service
 *
 * Catálogo de validações de runtime — READ ONLY.
 * Spec: backend/docs/AIOI_RUNTIME_VALIDATION_CATALOG_SPECIFICATION.md
 */

const cognitiveRuntimeValidation = require('./aioiCognitiveRuntimeValidationService');

const LAYER = 'AIOI_RUNTIME_VALIDATION_CATALOG';

const CATALOG_CATEGORIES = [
  'governance', 'compliance', 'assurance', 'knowledge', 'observation',
  'recommendation', 'human_review', 'authorization', 'simulation'
];

/**
 * Catálogo completo de validações de runtime.
 * @returns {Promise<object>}
 */
async function getRuntimeValidationCatalog() {
  const result = await cognitiveRuntimeValidation.generateRuntimeValidation();

  const catalog = {};
  for (const cat of CATALOG_CATEGORIES) {
    catalog[cat] = result.validations.filter(v => v.category === cat);
  }

  return {
    ok: true,
    layer: LAYER,
    categories: CATALOG_CATEGORIES,
    catalog,
    total_validations: result.validation_count,
    all_runtime_denied: result.all_runtime_denied,
    validation_only: result.validation_only,
    captured_at: new Date().toISOString()
  };
}

/**
 * Validações filtradas por categoria.
 * @param {string} category
 * @returns {Promise<object>}
 */
async function getRuntimeValidationsByCategory(category) {
  const full = await getRuntimeValidationCatalog();
  const normalized = String(category || '').toLowerCase();
  const items = full.catalog[normalized] || [];

  return {
    ok: true,
    layer: LAYER,
    category: normalized,
    validations: items,
    count: items.length,
    captured_at: new Date().toISOString()
  };
}

module.exports = {
  getRuntimeValidationCatalog,
  getRuntimeValidationsByCategory,
  CATALOG_CATEGORIES,
  LAYER
};
