/**
 * CPL-003 — Governance API (consulta apenas · sem executar engines).
 *
 * listCapabilities / getCapability aqui são vistas de governança
 * (lifecycle, ownership, version, consumers) — distintas da Discovery API CPL-002.
 */
import { COGNITIVE_PLATFORM_REGISTRY } from '../../registry/cognitivePlatformRegistry.js';
import { getCognitiveCapability } from '../../registry/cognitivePlatformRegistry.js';
import { getCapabilityLifecycle, listCapabilitiesByLifecycleStatus } from '../lifecycle/capabilityLifecycle.js';
import { getCapabilityOwnership, listOwnershipByDomain, listOwnershipByOwner } from '../ownership/capabilityOwnership.js';
import { getCapabilityVersion } from '../versioning/capabilityVersions.js';
import {
  CAPABILITY_COMPATIBILITY_MATRIX,
  listConsumers as listConsumersFromMatrix,
  listProviders as listProvidersFromMatrix,
  getCompatibilityRow
} from '../compatibility/capabilityCompatibility.js';
import {
  COGNITIVE_CAPABILITY_CATALOG,
  listCatalogByDomain,
  listCatalogByStatus
} from '../catalog/cognitiveCapabilityCatalog.js';
import { buildCapabilityDependencyGraph } from '../graph/capabilityDependencyGraph.js';
import {
  validateLifecycleIntegrity
} from '../lifecycle/capabilityLifecycle.js';
import { validateOwnershipIntegrity } from '../ownership/capabilityOwnership.js';
import { validateVersionIntegrity } from '../versioning/capabilityVersions.js';
import { validateCompatibilityIntegrity } from '../compatibility/capabilityCompatibility.js';
import { validateCatalogIntegrity } from '../catalog/cognitiveCapabilityCatalog.js';

export const CPL_GOVERNANCE_API_PHASE = 'CPL-003';

/** Lista capacidades com metadados de governança. */
export function listCapabilities() {
  return COGNITIVE_CAPABILITY_CATALOG.map((e) => ({ ...e }));
}

export function listByDomain(domain) {
  return listCatalogByDomain(domain);
}

export function listByStatus(status) {
  return listCatalogByStatus(status);
}

export function listByOwner(teamOrAlias) {
  return listOwnershipByOwner(teamOrAlias).map((o) => ({
    ...o,
    catalog: COGNITIVE_CAPABILITY_CATALOG.find((c) => c.capabilityId === o.capabilityId) || null
  }));
}

export function listConsumers(capabilityId = null) {
  if (capabilityId) return listConsumersFromMatrix(capabilityId);
  return CAPABILITY_COMPATIBILITY_MATRIX.map((row) => ({
    capabilityId: row.capabilityId,
    consumers: [...row.consumers]
  }));
}

export function listProviders(capabilityId = null) {
  return listProvidersFromMatrix(capabilityId);
}

/** Detalhe de governança de uma capability (sem executar regras cognitivas). */
export function getCapability(capabilityId) {
  const cap = getCognitiveCapability(capabilityId);
  if (!cap) return null;
  return Object.freeze({
    capabilityId: cap.capabilityId,
    label: cap.label,
    lifecycle: getCapabilityLifecycle(capabilityId),
    ownership: getCapabilityOwnership(capabilityId),
    version: getCapabilityVersion(capabilityId),
    compatibility: getCompatibilityRow(capabilityId),
    catalog: COGNITIVE_CAPABILITY_CATALOG.find((c) => c.capabilityId === capabilityId) || null,
    dependencyGraph: buildCapabilityDependencyGraph(capabilityId)
  });
}

export function getDependencyGraph(capabilityId = null) {
  return buildCapabilityDependencyGraph(capabilityId);
}

export function getEnterpriseCatalog() {
  return [...COGNITIVE_CAPABILITY_CATALOG];
}

export function validateCpl003GovernanceIntegrity() {
  const checks = [
    validateLifecycleIntegrity(),
    validateOwnershipIntegrity(),
    validateVersionIntegrity(),
    validateCompatibilityIntegrity(),
    validateCatalogIntegrity()
  ];
  const issues = checks.flatMap((c) => c.issues);
  return {
    valid: issues.length === 0,
    issues,
    lifecycle: checks[0].count,
    ownership: checks[1].count,
    versions: checks[2].count,
    compatibility: checks[3].count,
    catalog: checks[4].count,
    registrySize: COGNITIVE_PLATFORM_REGISTRY.length
  };
}

export {
  listCapabilitiesByLifecycleStatus,
  listOwnershipByDomain
};
