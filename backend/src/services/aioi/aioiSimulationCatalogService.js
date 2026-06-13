'use strict';

/**
 * AIOI-P14.2 — Simulation Catalog Service
 *
 * Catálogo de simulações controladas — READ ONLY.
 * Spec: backend/docs/AIOI_SIMULATION_CATALOG_SPECIFICATION.md
 */

const cognitiveSimulation = require('./aioiCognitiveSimulationService');

const LAYER = 'AIOI_SIMULATION_CATALOG';

const CATALOG_CATEGORIES = [
  'workflow', 'decision', 'sla', 'risk', 'capacity', 'governance', 'compliance'
];

/**
 * Catálogo completo de simulações.
 * @returns {Promise<object>}
 */
async function getSimulationCatalog() {
  const result = await cognitiveSimulation.generateControlledSimulations();

  const catalog = {};
  for (const cat of CATALOG_CATEGORIES) {
    catalog[cat] = result.simulations.filter(s => s.category === cat);
  }

  return {
    ok: true,
    layer: LAYER,
    categories: CATALOG_CATEGORIES,
    catalog,
    total_simulations: result.simulation_count,
    all_isolated: result.all_isolated,
    no_real_effects: result.no_real_effects,
    captured_at: new Date().toISOString()
  };
}

/**
 * Simulações filtradas por categoria.
 * @param {string} category
 * @returns {Promise<object>}
 */
async function getSimulationsByCategory(category) {
  const full = await getSimulationCatalog();
  const normalized = String(category || '').toLowerCase();
  const items = full.catalog[normalized] || [];

  return {
    ok: true,
    layer: LAYER,
    category: normalized,
    simulations: items,
    count: items.length,
    captured_at: new Date().toISOString()
  };
}

module.exports = {
  getSimulationCatalog,
  getSimulationsByCategory,
  CATALOG_CATEGORIES,
  LAYER
};
