'use strict';

const REGISTRY_PHASE = 'Z.18';
const REGISTRY_KIND = 'cognitive_block_definition';

function buildBlockMetadata(overrides = {}) {
  return Object.freeze({
    registry_phase: REGISTRY_PHASE,
    registry_kind: REGISTRY_KIND,
    delivery_mode: 'shadow_only',
    composable: true,
    hardcoded_dashboard: false,
    requires_real_data: false,
    graceful_empty_state: true,
    reuse_declaration: null,
    engine_bridge: null,
    priority: 'P2',
    ...overrides
  });
}

const GENERIC_INDUSTRIAL_TAGS = Object.freeze([
  'industrial_generic',
  'uptime',
  'production_aggregate',
  'executive_hybrid',
  'ai_score_generic'
]);

const QUALITY_SEMANTIC_TAGS = Object.freeze([
  'nc',
  'capa',
  'spc',
  'inspection',
  'audit',
  'supplier',
  'traceability',
  'conformance',
  'quality_governance'
]);

module.exports = {
  REGISTRY_PHASE,
  REGISTRY_KIND,
  buildBlockMetadata,
  GENERIC_INDUSTRIAL_TAGS,
  QUALITY_SEMANTIC_TAGS
};
