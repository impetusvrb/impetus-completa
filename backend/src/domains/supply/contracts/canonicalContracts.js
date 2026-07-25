'use strict';

function withSupplyMeta(entity, source = 'foundation') {
  return { ...entity, _source: source, _phase: 'GF-022' };
}

module.exports = { withSupplyMeta };
