'use strict';

const registry = require('../registry/cognitiveBlockRegistry');
const { validateBlockSchema } = require('../registry/cognitiveBlockSchemas');

function validateRegistryIntegrity() {
  const blocks = registry.listAllBlocks();
  const errors = [];
  const ids = new Set();

  for (const block of blocks) {
    const v = validateBlockSchema(block);
    if (!v.valid) {
      errors.push({ block_id: block.id, errors: v.errors });
    }
    if (ids.has(block.id)) {
      errors.push({ block_id: block.id, errors: ['duplicate_id'] });
    }
    ids.add(block.id);
    if (block.metadata?.hardcoded_dashboard === true) {
      errors.push({ block_id: block.id, errors: ['hardcoded_dashboard_forbidden_in_z18'] });
    }
  }

  return {
    valid: errors.length === 0,
    total_blocks: blocks.length,
    errors,
    phase: 'Z.18'
  };
}

module.exports = {
  validateRegistryIntegrity
};
