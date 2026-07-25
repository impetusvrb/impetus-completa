/**
 * CPL-003 — Enterprise Cognitive Capability Catalog.
 * Gerado automaticamente a partir do registry + lifecycle + ownership.
 * Sem duplicação de providers.
 */
import { COGNITIVE_PLATFORM_REGISTRY } from '../../registry/cognitivePlatformRegistry.js';
import { getCapabilityLifecycle } from '../lifecycle/capabilityLifecycle.js';
import { getCapabilityOwnership } from '../ownership/capabilityOwnership.js';
import { getCapabilityVersion } from '../versioning/capabilityVersions.js';
import { getCompatibilityRow } from '../compatibility/capabilityCompatibility.js';

export function buildCatalogEntry(cap) {
  const lifecycle = getCapabilityLifecycle(cap.capabilityId);
  const ownership = getCapabilityOwnership(cap.capabilityId);
  const version = getCapabilityVersion(cap.capabilityId);
  const compat = getCompatibilityRow(cap.capabilityId);
  return Object.freeze({
    capabilityId: cap.capabilityId,
    label: cap.label,
    domain: cap.ownerDomain,
    adapter: cap.adapterId,
    adapterStatus: cap.adapterStatus,
    status: lifecycle?.status || 'planned',
    contractId: cap.contractId,
    owner: ownership?.team || null,
    version: version?.current || '1.0.0',
    consumersCount: compat?.consumers?.length || 0,
    provider: cap.canonicalImplementation
  });
}

/** Catálogo corporativo — vista tabular Capability | Domain | Adapter | Status */
export const COGNITIVE_CAPABILITY_CATALOG = Object.freeze(
  COGNITIVE_PLATFORM_REGISTRY.map(buildCatalogEntry)
);

export function getCatalogEntry(capabilityId) {
  return COGNITIVE_CAPABILITY_CATALOG.find((e) => e.capabilityId === capabilityId) ?? null;
}

export function listCatalogByDomain(domain) {
  return COGNITIVE_CAPABILITY_CATALOG.filter((e) => e.domain === domain);
}

export function listCatalogByStatus(status) {
  return COGNITIVE_CAPABILITY_CATALOG.filter((e) => e.status === status);
}

export function validateCatalogIntegrity() {
  const issues = [];
  const ids = new Set();
  for (const entry of COGNITIVE_CAPABILITY_CATALOG) {
    if (ids.has(entry.capabilityId)) {
      issues.push(`duplicate catalog entry: ${entry.capabilityId}`);
    }
    ids.add(entry.capabilityId);
    if (!entry.domain) issues.push(`${entry.capabilityId}: missing domain`);
    if (!entry.status) issues.push(`${entry.capabilityId}: missing status`);
  }
  if (COGNITIVE_CAPABILITY_CATALOG.length !== COGNITIVE_PLATFORM_REGISTRY.length) {
    issues.push('catalog length mismatch vs registry');
  }
  return {
    valid: issues.length === 0,
    issues,
    count: COGNITIVE_CAPABILITY_CATALOG.length
  };
}
