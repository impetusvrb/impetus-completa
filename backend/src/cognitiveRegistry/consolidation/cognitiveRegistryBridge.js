'use strict';

/**
 * Ponte aditiva — redirect autoritativo SSOT para consumidores legados (modo on).
 * Fallback automático para registry directo se SSOT inactivo ou tenant fora do piloto.
 */

const flags = require('./cognitiveRegistryConsolidationFlags');

function shouldUseAuthoritativePath(ctx = {}) {
  if (!flags.isConsolidationActive() || !flags.allowsAuthoritativeRedirect()) {
    return false;
  }
  const companyId = ctx.companyId || ctx.company_id || null;
  if (companyId) return flags.isPilotTenant(companyId);
  return true;
}

function getBlockById(blockId, ctx = {}) {
  if (!shouldUseAuthoritativePath(ctx)) {
    const registry = require('../../cognitiveRuntime/registry/cognitiveBlockRegistry');
    return registry.getBlockById(blockId);
  }
  const unified = require('./unifiedCognitiveRegistry');
  const resolved = unified.resolveBlock(blockId, ctx);
  return resolved.ok ? resolved.block : null;
}

function listBlocksByDomain(domain, ctx = {}) {
  if (!shouldUseAuthoritativePath(ctx)) {
    const registry = require('../../cognitiveRuntime/registry/cognitiveBlockRegistry');
    return registry.listBlocksByDomain(domain);
  }
  const unified = require('./unifiedCognitiveRegistry');
  return unified.listBlocksByDomain(domain, ctx);
}

function resolveBlockEnriched(blockId, ctx = {}) {
  if (!shouldUseAuthoritativePath(ctx)) {
    const resolver = require('../../cognitiveRuntime/composition/cognitiveBlockResolver');
    return resolver.resolveBlock(blockId, ctx);
  }
  const unified = require('./unifiedCognitiveRegistry');
  const r = unified.resolveBlock(blockId, ctx);
  if (!r.ok) {
    return { found: false, block_id: blockId, authority: null };
  }
  const { buildAuthorityMetadata } = require('../../cognitiveRuntime/registry/cognitiveBlockAuthority');
  const authority = buildAuthorityMetadata(r.block, ctx);
  return {
    found: true,
    block_id: r.block.id,
    block: r.block,
    authority,
    eligible: authority.authority_granted,
    ssot: true,
    sources: r.sources
  };
}

module.exports = {
  shouldUseAuthoritativePath,
  getBlockById,
  listBlocksByDomain,
  resolveBlockEnriched
};
