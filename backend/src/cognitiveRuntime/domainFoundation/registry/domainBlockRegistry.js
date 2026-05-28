'use strict';

const registry = require('../../registry/cognitiveBlockRegistry');
const { getDomainDefinition } = require('./cognitiveDomainRegistry');

function _listBlocksRaw(domain) {
  const all = registry.listBlocksByDomain(domain);
  if (all.length > 0) return all;
  const def = getDomainDefinition(domain);
  if (!def) return [];
  const prefix = def.cognitive_block_prefix;
  return registry.listAllBlocks().filter((b) => String(b.id || '').startsWith(prefix));
}

function listBlocksForDomain(domain, ctx = {}) {
  try {
    const bridge = require('../../../cognitiveRegistry/consolidation/cognitiveRegistryBridge');
    if (bridge.shouldUseAuthoritativePath(ctx)) {
      return bridge.listBlocksByDomain(domain, ctx);
    }
  } catch (_e) {
    /* fallback legado */
  }
  return _listBlocksRaw(domain);
}

function getBlocksByDomainWithWeight(domain, profileTier = 'coordination') {
  const blocks = _listBlocksRaw(domain);
  const weightMap = { operational: 0.7, management: 0.2, strategic: 0.1 };
  const def = getDomainDefinition(domain);
  if (def?.weighting) {
    weightMap.operational = def.weighting.operational;
    weightMap.management = def.weighting.governance;
    weightMap.strategic = def.weighting.strategic;
  }

  return blocks.map((b) => {
    const layer = b.semantic_layer || 'operational';
    const tierWeight =
      layer === 'strategic' ? weightMap.strategic
        : layer === 'management' ? weightMap.management
          : weightMap.operational;
    return {
      ...b,
      domain_weight: tierWeight,
      effective_score: (b.hierarchy?.[`${profileTier === 'coordination' ? 'operational' : profileTier}_weight`] ?? 0.5) * tierWeight
    };
  }).sort((a, b) => b.effective_score - a.effective_score);
}

module.exports = { listBlocksForDomain, getBlocksByDomainWithWeight };
