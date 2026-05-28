'use strict';

/**
 * Catálogo canónico de fontes de registry — documenta papéis (evita sprawl).
 */

const REGISTRY_SOURCES = Object.freeze([
  {
    id: 'cognitive_block_registry',
    module: 'cognitiveRuntime/registry/cognitiveBlockRegistry',
    role: 'metadata_catalog',
    authority: 'block_definitions',
    delivery_active: false,
    ssot_for: ['block_metadata', 'block_contracts'],
    not_ssot_for: ['widget_delivery', 'runtime_render']
  },
  {
    id: 'cognitive_domain_registry',
    module: 'cognitiveRuntime/domainFoundation/registry/cognitiveDomainRegistry',
    role: 'domain_policy',
    authority: 'domain_governance',
    ssot_for: ['domain_weighting', 'isolation_rules', 'cockpit_density'],
    not_ssot_for: ['block_implementation']
  },
  {
    id: 'domain_block_registry',
    module: 'cognitiveRuntime/domainFoundation/registry/domainBlockRegistry',
    role: 'adapter',
    authority: 'none',
    delegates_to: ['cognitive_block_registry', 'cognitive_domain_registry'],
    ssot_for: [],
    not_ssot_for: ['canonical_definitions']
  },
  {
    id: 'cockpit_composition_registry',
    module: 'cognitiveRuntime/domainFoundation/registry/cockpitCompositionRegistry',
    role: 'composition_policy',
    authority: 'persona_weights',
    ssot_for: ['persona_blending', 'composition_config'],
    not_ssot_for: ['block_catalog']
  },
  {
    id: 'cognitive_entrypoint_registry',
    module: 'services/enterprise/cognitiveEntrypointRegistry',
    role: 'entrypoint_lifecycle',
    authority: 'cognitive_entrypoints',
    ssot_for: ['entrypoint_catalog', 'flow_lifecycle'],
    not_ssot_for: ['cockpit_blocks']
  },
  {
    id: 'unified_cognitive_registry',
    module: 'cognitiveRegistry/consolidation/unifiedCognitiveRegistry',
    role: 'facade_ssot',
    authority: 'read_consolidation',
    ssot_for: ['unified_resolve', 'divergence_report', 'registry_health'],
    not_ssot_for: ['legacy_direct_imports']
  },
  {
    id: 'engine_v2_cockpit',
    module: 'cognitiveRuntime/facade/cognitiveRuntimeFacade',
    role: 'delivery_runtime',
    authority: 'actual_delivery',
    ssot_for: ['runtime_delivery', 'render_promotion'],
    not_ssot_for: ['static_block_catalog']
  }
]);

const DELIVERY_AUTHORITY = Object.freeze({
  primary: 'engine_v2_cockpit',
  metadata: 'cognitive_block_registry',
  note:
    'delivery_active=false no block registry é intencional — entrega real via Engine V2 / composição.'
});

function listSources() {
  return REGISTRY_SOURCES.map((s) => ({ ...s }));
}

function getSource(id) {
  return REGISTRY_SOURCES.find((s) => s.id === id) || null;
}

module.exports = {
  REGISTRY_SOURCES,
  DELIVERY_AUTHORITY,
  listSources,
  getSource
};
