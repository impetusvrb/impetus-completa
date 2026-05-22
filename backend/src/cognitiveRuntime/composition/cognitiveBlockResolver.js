'use strict';

const registry = require('../registry/cognitiveBlockRegistry');
const { QUALITY_BLOCK_ALIASES, QUALITY_PILOT_BLOCK_IDS } = require('../registry/qualityCognitiveBlockPack');
const { buildAuthorityMetadata } = require('../registry/cognitiveBlockAuthority');

function canonicalizeBlockId(blockId) {
  const id = String(blockId || '').trim();
  return QUALITY_BLOCK_ALIASES[id] || id;
}

function resolveBlock(blockId, ctx = {}) {
  const canonical = canonicalizeBlockId(blockId);
  const block = registry.getBlockById(canonical);
  if (!block) {
    return { found: false, block_id: blockId, canonical_id: canonical, authority: null };
  }
  const authority = buildAuthorityMetadata(block, ctx);
  return {
    found: true,
    block_id: block.id,
    canonical_id: canonical,
    alias_from: blockId !== canonical ? blockId : null,
    block,
    authority,
    eligible: authority.authority_granted
  };
}

function resolveBlocks(blockIds = [], ctx = {}) {
  const results = [];
  const seen = new Set();
  for (const rawId of blockIds) {
    const r = resolveBlock(rawId, ctx);
    if (!r.found || seen.has(r.block_id)) continue;
    seen.add(r.block_id);
    results.push(r);
  }
  return results;
}

function listQualityPilotBlocks(ctx = {}) {
  return resolveBlocks(QUALITY_PILOT_BLOCK_IDS, ctx).filter((r) => r.eligible);
}

function resolveBlocksForDomain(domain, ctx = {}) {
  const domainKey = String(domain || 'quality').toLowerCase();
  if (domainKey === 'quality') {
    return listQualityPilotBlocks(ctx);
  }
  const blocks = registry.listBlocksByDomain(domainKey);
  return blocks
    .map((b) => resolveBlock(b.id, ctx))
    .filter((r) => r.found && r.eligible);
}

module.exports = {
  canonicalizeBlockId,
  resolveBlock,
  resolveBlocks,
  listQualityPilotBlocks,
  resolveBlocksForDomain,
  QUALITY_PILOT_BLOCK_IDS
};
