/**
 * CPL-003 — Enterprise Cognitive Capability Governance.
 *
 * Metadata + consultas. Sem engines, adapters novos ou registries paralelos.
 *
 * Nota: listCapabilities / getCapability da Governance API são exportados
 * como listGovernedCapabilities / getGovernedCapability no barrel principal
 * para não colidir com a Discovery API CPL-002.
 */
export * from './lifecycle/index.js';
export * from './ownership/index.js';
export * from './versioning/index.js';
export * from './catalog/index.js';
export * from './graph/index.js';
export {
  CAPABILITY_COMPATIBILITY_MATRIX,
  buildCompatibilityRow,
  getCompatibilityRow,
  validateCompatibilityIntegrity
} from './compatibility/index.js';
export {
  CPL_GOVERNANCE_API_PHASE,
  listCapabilities as listGovernedCapabilities,
  listByDomain,
  listByStatus,
  listByOwner,
  listConsumers,
  listProviders as listCapabilityProviders,
  getCapability as getGovernedCapability,
  getDependencyGraph,
  getEnterpriseCatalog,
  validateCpl003GovernanceIntegrity,
  listCapabilitiesByLifecycleStatus,
  listOwnershipByDomain
} from './api/index.js';
