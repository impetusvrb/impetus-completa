'use strict';

/** @typedef {'definition'|'shadow'|'composed'} CognitiveBlockLifecycle */
/** @typedef {'operational'|'management'|'strategic'|'cognitive'|'narrative'} SemanticLayer */
/** @typedef {'widget'|'kpi_cluster'|'narrative'|'telemetry'|'insight_panel'} BlockSurface */

const BLOCK_SCHEMA_VERSION = '1.0.0';

const REQUIRED_BLOCK_FIELDS = [
  'id',
  'domain',
  'semantic_category',
  'contract',
  'authority',
  'hierarchy',
  'metadata'
];

const CONTRACT_REQUIRED = ['composition_role', 'data_binding', 'governance_tags'];

const AUTHORITY_REQUIRED = ['min_hierarchy_tier', 'domain_owner', 'cross_domain_allowed'];

const HIERARCHY_REQUIRED = ['operational_weight', 'management_weight', 'strategic_weight'];

function validateBlockSchema(block) {
  const errors = [];
  if (!block || typeof block !== 'object') {
    return { valid: false, errors: ['block_must_be_object'] };
  }
  for (const f of REQUIRED_BLOCK_FIELDS) {
    if (block[f] == null) errors.push(`missing_${f}`);
  }
  if (block.contract) {
    for (const f of CONTRACT_REQUIRED) {
      if (block.contract[f] == null) errors.push(`contract_missing_${f}`);
    }
  }
  if (block.authority) {
    for (const f of AUTHORITY_REQUIRED) {
      if (block.authority[f] == null) errors.push(`authority_missing_${f}`);
    }
  }
  if (block.hierarchy) {
    for (const f of HIERARCHY_REQUIRED) {
      if (typeof block.hierarchy[f] !== 'number') errors.push(`hierarchy_invalid_${f}`);
    }
    const sum =
      (block.hierarchy.operational_weight || 0) +
      (block.hierarchy.management_weight || 0) +
      (block.hierarchy.strategic_weight || 0);
    if (Math.abs(sum - 1) > 0.05) errors.push('hierarchy_weights_must_sum_to_1');
  }
  if (block.id && !/^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$/.test(block.id)) {
    errors.push('id_must_match_domain_slug_pattern');
  }
  return { valid: errors.length === 0, errors, schema_version: BLOCK_SCHEMA_VERSION };
}

function createBlockDefinition(partial) {
  const block = {
    lifecycle: 'definition',
    schema_version: BLOCK_SCHEMA_VERSION,
    ...partial
  };
  const v = validateBlockSchema(block);
  if (!v.valid) {
    throw new Error(`Invalid cognitive block definition: ${block.id || '?'} — ${v.errors.join(', ')}`);
  }
  return Object.freeze(block);
}

module.exports = {
  BLOCK_SCHEMA_VERSION,
  REQUIRED_BLOCK_FIELDS,
  validateBlockSchema,
  createBlockDefinition
};
