'use strict';

const registry = require('../registry/cognitiveBlockRegistry');
const { QUALITY_BLOCK_ALIASES, QUALITY_PILOT_BLOCK_IDS } = require('../registry/qualityCognitiveBlockPack');
const { SST_BLOCK_ALIASES, SST_PILOT_BLOCK_IDS } = require('../registry/sstCognitiveBlockPack');
const { HR_BLOCK_ALIASES, HR_PILOT_BLOCK_IDS } = require('../registry/hrCognitiveBlockPack');
const { PRODUCTION_BLOCK_ALIASES, PRODUCTION_PILOT_BLOCK_IDS } = require('../registry/productionCognitiveBlockPack');
const { ENVIRONMENTAL_BLOCK_ALIASES, ENVIRONMENTAL_PILOT_BLOCK_IDS } = require('../registry/environmentalCognitiveBlockPack');
const { buildAuthorityMetadata } = require('../registry/cognitiveBlockAuthority');

function canonicalizeBlockId(blockId) {
  const id = String(blockId || '').trim();
  return (
    QUALITY_BLOCK_ALIASES[id] ||
    SST_BLOCK_ALIASES[id] ||
    HR_BLOCK_ALIASES[id] ||
    PRODUCTION_BLOCK_ALIASES[id] ||
    ENVIRONMENTAL_BLOCK_ALIASES[id] ||
    id
  );
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

function listSstPilotBlocks(ctx = {}) {
  return resolveBlocks(SST_PILOT_BLOCK_IDS, ctx).filter((r) => r.eligible);
}

function listHrPilotBlocks(ctx = {}) {
  return resolveBlocks(HR_PILOT_BLOCK_IDS, ctx).filter((r) => r.eligible);
}

function listProductionPilotBlocks(ctx = {}) {
  return resolveBlocks(PRODUCTION_PILOT_BLOCK_IDS, ctx).filter((r) => r.eligible);
}

function listEnvironmentalPilotBlocks(ctx = {}) {
  return resolveBlocks(ENVIRONMENTAL_PILOT_BLOCK_IDS, ctx).filter((r) => r.eligible);
}

function resolveBlocksForDomain(domain, ctx = {}) {
  const domainKey = String(domain || 'quality').toLowerCase();
  if (domainKey === 'quality') {
    return listQualityPilotBlocks(ctx);
  }
  if (domainKey === 'safety' || domainKey === 'sst') {
    return listSstPilotBlocks(ctx);
  }
  if (domainKey === 'environmental' || domainKey === 'ambiental') {
    return listEnvironmentalPilotBlocks(ctx);
  }
  if (domainKey === 'production' || domainKey === 'producao') {
    return listProductionPilotBlocks(ctx);
  }
  if (domainKey === 'hr' || domainKey === 'rh') {
    return listHrPilotBlocks(ctx);
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
  listSstPilotBlocks,
  listHrPilotBlocks,
  listProductionPilotBlocks,
  listEnvironmentalPilotBlocks,
  resolveBlocksForDomain,
  QUALITY_PILOT_BLOCK_IDS,
  SST_PILOT_BLOCK_IDS,
  HR_PILOT_BLOCK_IDS,
  PRODUCTION_PILOT_BLOCK_IDS,
  ENVIRONMENTAL_PILOT_BLOCK_IDS
};
