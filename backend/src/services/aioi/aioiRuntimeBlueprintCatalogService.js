'use strict';

/**
 * AIOI-P16.2 — Runtime Blueprint Catalog Service
 *
 * Catálogo de blueprints de runtime — READ ONLY.
 * Spec: backend/docs/AIOI_RUNTIME_BLUEPRINT_CATALOG_SPECIFICATION.md
 */

const cognitiveRuntimeBlueprint = require('./aioiCognitiveRuntimeBlueprintService');

const LAYER = 'AIOI_RUNTIME_BLUEPRINT_CATALOG';

const CATALOG_CATEGORIES = [
  'governance', 'compliance', 'assurance', 'knowledge', 'observation',
  'recommendation', 'human_review', 'authorization', 'simulation', 'runtime'
];

/**
 * Catálogo completo de blueprints de runtime.
 * @returns {Promise<object>}
 */
async function getRuntimeBlueprintCatalog() {
  const result = await cognitiveRuntimeBlueprint.generateRuntimeBlueprint();

  const catalog = {};
  for (const cat of CATALOG_CATEGORIES) {
    catalog[cat] = result.runtime_components.filter(c => c.category === cat);
  }

  return {
    ok: true,
    layer: LAYER,
    categories: CATALOG_CATEGORIES,
    catalog,
    blueprint_id:     result.blueprint_id,
    blueprint_status: result.blueprint_status,
    total_components: result.runtime_components.length,
    total_gates:      result.runtime_gates.length,
    all_gates_closed: result.all_gates_closed,
    deployable:       result.deployable,
    captured_at:      new Date().toISOString()
  };
}

/**
 * Componentes filtrados por categoria.
 * @param {string} category
 * @returns {Promise<object>}
 */
async function getBlueprintsByCategory(category) {
  const full = await getRuntimeBlueprintCatalog();
  const normalized = String(category || '').toLowerCase();
  const items = full.catalog[normalized] || [];

  return {
    ok: true,
    layer: LAYER,
    category: normalized,
    components: items,
    count: items.length,
    captured_at: new Date().toISOString()
  };
}

module.exports = {
  getRuntimeBlueprintCatalog,
  getBlueprintsByCategory,
  CATALOG_CATEGORIES,
  LAYER
};
