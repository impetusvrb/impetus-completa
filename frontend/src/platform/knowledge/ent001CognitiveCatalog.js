/**
 * ENT-001 — Catálogo cognitivo consolidado (CPL discovery + registry + governance).
 */
import { COGNITIVE_DISCOVERY_CATALOG } from '../cognitive/discovery/cognitiveDiscoveryIndex.js';
import {
  COGNITIVE_PLATFORM_REGISTRY,
  COGNITIVE_ADAPTER_REGISTRY
} from '../cognitive/registry/cognitivePlatformRegistry.js';
import { COGNITIVE_CAPABILITY_CATALOG } from '../cognitive/governance/catalog/cognitiveCapabilityCatalog.js';
import { FIN_COGNITIVE_CAPABILITIES } from '../audit/finance/finAud001CognitiveAudit.js';
import { ENT_001_PHASE } from './ent001Constants.js';

export function buildCognitiveCatalog() {
  const byCapability = new Map();

  for (const cap of COGNITIVE_PLATFORM_REGISTRY) {
    const gov = COGNITIVE_CAPABILITY_CATALOG.find((g) => g.capabilityId === cap.capabilityId);
    byCapability.set(
      cap.capabilityId,
      Object.freeze({
        capabilityId: cap.capabilityId,
        label: cap.label,
        domain: cap.ownerDomain,
        contractId: cap.contractId,
        provider: cap.canonicalImplementation,
        alternateImplementations: Object.freeze([...(cap.alternateImplementations || [])]),
        adapter: cap.adapterId,
        adapterStatus: cap.adapterStatus,
        lifecycleStatus: gov?.status || 'unknown',
        owner: gov?.owner || null,
        version: gov?.version || null,
        consumersCount: gov?.consumersCount || 0,
        reuse: cap.reuse,
        source: 'CPL registry + governance'
      })
    );
  }

  const discoveryOnly = COGNITIVE_DISCOVERY_CATALOG.filter(
    (d) => !byCapability.has(d.capability)
  ).map((d) =>
    Object.freeze({
      capabilityId: d.capability,
      label: d.capability,
      domain: d.domain,
      contractId: null,
      provider: (d.paths && d.paths[0]) || null,
      discoveryId: d.id,
      category: d.category,
      status: d.status,
      owner: d.owner,
      source: 'CPL-001 discovery only'
    })
  );

  const financeCognitive = FIN_COGNITIVE_CAPABILITIES.map((f) =>
    Object.freeze({
      capabilityId: f.capabilityId || f.id,
      label: f.label || f.name,
      domain: 'finance',
      contractId: f.contractId || null,
      provider: f.location || null,
      status: f.status,
      note: f.note || null,
      source: 'FIN-AUD-001 cognitive audit'
    })
  );

  const adapters = COGNITIVE_ADAPTER_REGISTRY.map((a) =>
    Object.freeze({
      capabilityId: `adapter:${a.adapterId}`,
      label: a.label,
      domain: a.targetDomain,
      contractId: null,
      provider: a.runtimePath,
      adapter: a.adapterId,
      adapterStatus: a.status,
      bridges: Object.freeze([...(a.bridges || [])]),
      source: 'CPL-002 adapter registry'
    })
  );

  return Object.freeze([
    ...byCapability.values(),
    ...discoveryOnly,
    ...financeCognitive,
    ...adapters
  ]);
}

export const ENT_COGNITIVE_CATALOG = buildCognitiveCatalog();

export function getCognitiveEntry(capabilityId) {
  return ENT_COGNITIVE_CATALOG.find((c) => c.capabilityId === capabilityId) ?? null;
}

export function listCognitiveByDomain(domain) {
  return ENT_COGNITIVE_CATALOG.filter((c) => c.domain === domain);
}

export function validateCognitiveCatalog() {
  const issues = [];
  const registryCount = COGNITIVE_PLATFORM_REGISTRY.length;
  const inCatalog = ENT_COGNITIVE_CATALOG.filter((c) => c.source?.includes('CPL registry')).length;
  if (inCatalog < registryCount) {
    issues.push(`registry capabilities in catalog: ${inCatalog}/${registryCount}`);
  }
  if (COGNITIVE_DISCOVERY_CATALOG.length < 20) {
    issues.push('CPL discovery catalog unexpectedly small');
  }
  return {
    valid: issues.length === 0,
    issues,
    phase: ENT_001_PHASE,
    count: ENT_COGNITIVE_CATALOG.length,
    discoveryCount: COGNITIVE_DISCOVERY_CATALOG.length,
    registryCount,
    adapterCount: COGNITIVE_ADAPTER_REGISTRY.length
  };
}
