'use strict';

const { classifyModuleList } = require('./moduleDeliveryClassification');

function buildGovernedModuleAuthorityMap(matrix = {}, authority = {}) {
  const governed = authority.governed_visible_modules || matrix.permitted_modules_simulation || [];
  const blocked = authority.blocked_modules || [];
  const map = {};

  for (const mod of governed) {
    map[mod] = { state: 'governed', source: 'domain_authority' };
  }
  for (const b of blocked) {
    const id = b.module || b;
    map[id] = { state: 'blocked', source: 'domain_isolation' };
  }
  for (const item of matrix.module_classifications || []) {
    if (!map[item.module_id]) {
      map[item.module_id] = { state: 'classified', classification: item.classification };
    }
  }

  return {
    authority_map: map,
    governed_count: governed.length,
    blocked_count: blocked.length,
    auto_apply: false
  };
}

module.exports = { buildGovernedModuleAuthorityMap };
