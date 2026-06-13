'use strict';

/**
 * AIOI-P10.2 — Observation Catalog Service
 *
 * Catálogo de observações por domínio — READ ONLY.
 * Spec: backend/docs/AIOI_OBSERVATION_CATALOG_SPECIFICATION.md
 */

const cognitiveObservation = require('./aioiCognitiveObservationService');
const knowledgeCatalog = require('./aioiKnowledgeCatalogService');
const governanceAssurance = require('./aioiGovernanceAssuranceService');

const LAYER = 'AIOI_OBSERVATION_CATALOG';

const CATALOG_CATEGORIES = [
  'workflow', 'decision', 'sla', 'risk', 'capacity', 'compliance', 'governance'
];

const CATEGORY_MAP = {
  throughput: 'workflow',
  decision:   'decision',
  sla:        'sla',
  risk:       'risk',
  capacity:   'capacity',
  compliance: 'compliance'
};

function _mapObservationToCatalog(obs) {
  const catalogCategory = CATEGORY_MAP[obs.category] || obs.category;
  return { ...obs, catalog_category: catalogCategory };
}

/**
 * Catálogo completo de observações.
 * @returns {Promise<object>}
 */
async function getObservationCatalog() {
  const [observations, knowledge, assurance] = await Promise.all([
    cognitiveObservation.generateStructuredObservations(),
    knowledgeCatalog.getKnowledgeCatalog(),
    governanceAssurance.validateContinuousGovernance()
  ]);

  const mapped = observations.observations.map(_mapObservationToCatalog);

  const byCategory = {};
  for (const cat of CATALOG_CATEGORIES) {
    byCategory[cat] = mapped.filter(o => o.catalog_category === cat);
  }

  if (byCategory.governance.length === 0) {
    byCategory.governance.push({
      observation_id:   `OBS-GOVERNANCE-${Date.now().toString(36)}`,
      category:         'governance',
      catalog_category: 'governance',
      source_domains:   ['aioiGovernanceAssuranceService'],
      observation_text: `Governança observada: assurance_score=${assurance.governance_assurance_score}, sovereigns_protected=${assurance.sovereign_protection_verification.all_sovereigns_protected}.`,
      evidence_sources: [
        { type: 'assurance', source: 'aioiGovernanceAssuranceService', field: 'governance_assurance_score' }
      ],
      interpretation_free: true,
      generated_at: new Date().toISOString()
    });
  }

  return {
    ok: true,
    layer: LAYER,
    categories: CATALOG_CATEGORIES,
    catalog: byCategory,
    total_observations: Object.values(byCategory).reduce((s, arr) => s + arr.length, 0),
    knowledge_entries:  knowledge.catalog_entry_count,
    captured_at: new Date().toISOString()
  };
}

/**
 * Observações filtradas por categoria de catálogo.
 * @param {string} category
 * @returns {Promise<object>}
 */
async function getObservationsByCategory(category) {
  const catalog = await getObservationCatalog();
  const normalized = String(category || '').toLowerCase();
  const items = catalog.catalog[normalized] || [];

  return {
    ok: true,
    layer: LAYER,
    category: normalized,
    observations: items,
    count: items.length,
    captured_at: new Date().toISOString()
  };
}

module.exports = {
  getObservationCatalog,
  getObservationsByCategory,
  CATALOG_CATEGORIES,
  LAYER
};
