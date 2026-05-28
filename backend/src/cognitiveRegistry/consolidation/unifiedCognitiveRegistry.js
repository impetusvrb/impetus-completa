'use strict';

/**
 * PROMPT 26 — Single Source of Truth (leitura consolidada).
 * Não substitui imports legados; unifica resolução e metadata.
 */

const flags = require('./cognitiveRegistryConsolidationFlags');
const sourceCatalog = require('./registrySourceCatalog');
const { detectDivergences } = require('./metadataDivergenceDetector');

let _cachedSnapshot = null;
let _cachedAt = 0;
const CACHE_TTL_MS = 60_000;

function _log(event, data) {
  try {
    console.info(
      '[COGNITIVE_REGISTRY_SSOT]',
      JSON.stringify({ event, ts: new Date().toISOString(), mode: flags.consolidationMode(), ...data })
    );
  } catch (_e) {}
}

function _loadRegistries() {
  const blockRegistry = require('../../cognitiveRuntime/registry/cognitiveBlockRegistry');
  const domainRegistry = require('../../cognitiveRuntime/domainFoundation/registry/cognitiveDomainRegistry');
  const entrypointRegistry = require('../../services/enterprise/cognitiveEntrypointRegistry');

  const blocks = blockRegistry.listAllBlocks();
  const domains = domainRegistry.COGNITIVE_DOMAINS || {};
  const entrypoints = entrypointRegistry.getRegisteredEntrypoints
    ? entrypointRegistry.getRegisteredEntrypoints()
    : [];

  return {
    blocks,
    domains,
    entrypoints,
    block_registry_stats: blockRegistry.getRegistryStats(),
    entrypoint_health: entrypointRegistry.getHealth ? entrypointRegistry.getHealth() : null
  };
}

function buildSnapshot(force = false) {
  const now = Date.now();
  if (!force && _cachedSnapshot && now - _cachedAt < CACHE_TTL_MS) {
    return _cachedSnapshot;
  }

  const raw = _loadRegistries();
  const divergence = detectDivergences(raw);

  _cachedSnapshot = {
    ssot_version: 1,
    generated_at: new Date().toISOString(),
    consolidation_mode: flags.consolidationMode(),
    active: flags.isConsolidationActive(),
    delivery_authority: sourceCatalog.DELIVERY_AUTHORITY,
    sources: sourceCatalog.listSources(),
    counts: {
      blocks: raw.blocks.length,
      domains: Object.keys(raw.domains).length,
      entrypoints: raw.entrypoints.length
    },
    block_registry_stats: raw.block_registry_stats,
    entrypoint_health: raw.entrypoint_health,
    divergence,
    registry_role: {
      blocks: 'metadata_catalog',
      domains: 'domain_policy',
      entrypoints: 'entrypoint_lifecycle',
      delivery: sourceCatalog.DELIVERY_AUTHORITY.primary
    }
  };

  _cachedAt = now;
  _log('snapshot_built', { blocks: _cachedSnapshot.counts.blocks, issues: divergence.count });
  return _cachedSnapshot;
}

/**
 * Resolve bloco + domínio + papel de entrega (sem side effects).
 */
function resolveBlock(blockId, ctx = {}) {
  const blockRegistry = require('../../cognitiveRuntime/registry/cognitiveBlockRegistry');
  const domainRegistry = require('../../cognitiveRuntime/domainFoundation/registry/cognitiveDomainRegistry');
  const domainBlockAdapter = require('../../cognitiveRuntime/domainFoundation/registry/domainBlockRegistry');

  const block = blockRegistry.getBlockById(blockId);
  if (!block) {
    return { ok: false, reason: 'block_not_found', block_id: blockId };
  }

  const domKey = String(block.domain || '').toLowerCase();
  const domain =
    domainRegistry.getDomainDefinition(domKey) ||
    domainRegistry.getDomainDefinition(domKey === 'sst' ? 'safety' : domKey);

  const weighted =
    domain && domainBlockAdapter.getBlocksByDomainWithWeight
      ? domainBlockAdapter.getBlocksByDomainWithWeight(domKey, ctx.profileTier || 'coordination').find((b) => b.id === block.id)
      : null;

  return {
    ok: true,
    block_id: block.id,
    block,
    domain: domain || null,
    domain_weight: weighted?.domain_weight ?? null,
    sources: ['cognitive_block_registry', domain ? 'cognitive_domain_registry' : null].filter(Boolean),
    delivery_authority: sourceCatalog.DELIVERY_AUTHORITY.primary,
    metadata_only: blockRegistry.getRegistryStats().delivery_active === false,
    consolidation_mode: flags.consolidationMode()
  };
}

function resolveDomain(domainKey) {
  const domainRegistry = require('../../cognitiveRuntime/domainFoundation/registry/cognitiveDomainRegistry');
  const blockRegistry = require('../../cognitiveRuntime/registry/cognitiveBlockRegistry');

  const def = domainRegistry.getDomainDefinition(domainKey);
  const blocks = blockRegistry.listBlocksByDomain(domainKey);

  return {
    ok: !!def,
    domain: domainKey,
    definition: def,
    block_count: blocks.length,
    blocks_preview: blocks.slice(0, 8).map((b) => b.id),
    sources: ['cognitive_domain_registry', 'cognitive_block_registry']
  };
}

function listBlocksByDomain(domain, opts = {}) {
  const adapter = require('../../cognitiveRuntime/domainFoundation/registry/domainBlockRegistry');
  if (flags.allowsAuthoritativeRedirect() && adapter.getBlocksByDomainWithWeight) {
    return adapter.getBlocksByDomainWithWeight(
      domain,
      opts.profileTier || opts.profile_tier || 'coordination'
    );
  }
  if (adapter.listBlocksForDomain) {
    return adapter.listBlocksForDomain(domain);
  }
  const blockRegistry = require('../../cognitiveRuntime/registry/cognitiveBlockRegistry');
  return blockRegistry.listBlocksByDomain(domain);
}

function getHealth() {
  const snap = buildSnapshot();
  return {
    mode: flags.consolidationMode(),
    active: flags.isConsolidationActive(),
    audit_persist: flags.shouldPersistAuditTrail(),
    authoritative_redirect: flags.allowsAuthoritativeRedirect(),
    pilot_tenants: flags.pilotTenants(),
    snapshot: {
      counts: snap.counts,
      divergence: {
        total: snap.divergence.count,
        high: snap.divergence.high,
        medium: snap.divergence.medium
      },
      delivery_authority: snap.delivery_authority,
      registry_role: snap.registry_role
    }
  };
}

function invalidateCache() {
  _cachedSnapshot = null;
  _cachedAt = 0;
}

module.exports = {
  buildSnapshot,
  resolveBlock,
  resolveDomain,
  listBlocksByDomain,
  getHealth,
  invalidateCache,
  detectDivergences: () => detectDivergences(_loadRegistries())
};
