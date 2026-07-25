/**
 * FIN-AUD-001 — Audit API (consultas apenas · sem executar engines).
 */
import { FIN_AUD_DISCOVERY_CATALOG, getDiscoveryEntry, listCrossDomainReferences, validateDiscoveryIndex } from './finAud001DiscoveryIndex.js';
import { FIN_CAPABILITY_INVENTORY, getInventoryEntry, listInventoryByDomain, listInventoryByMaturity } from './finAud001CapabilityInventory.js';
import { FIN_MODULE_MAP, getModuleMapEntry, listHiddenOrExperimentalModules } from './finAud001ModuleMap.js';
import { FIN_RUNTIME_MAP, getRuntimeEntry } from './finAud001RuntimeMap.js';
import { FIN_RULES_INDEX, listRulesByType } from './finAud001RulesIndex.js';
import { FIN_CONTRACTS_INDEX, getContractEntry, listBrokenContracts } from './finAud001ContractsIndex.js';
import { FIN_COGNITIVE_CAPABILITIES, listCognitiveByStatus } from './finAud001CognitiveAudit.js';
import { buildFinanceDependencyGraph, getFinanceDependenciesForModule } from './finAud001DependencyGraph.js';
import { getGapAnalysis, validateGapAnalysis } from './finAud001GapAnalysis.js';

export const FIN_AUDIT_API_PHASE = 'FIN-AUD-001';

export function listCapabilities() {
  return FIN_CAPABILITY_INVENTORY.map((e) => ({ ...e }));
}

export function listByDomain(domain) {
  return listInventoryByDomain(domain);
}

export function listByStatus(status) {
  return FIN_CAPABILITY_INVENTORY.filter((e) => e.status === status);
}

export function listByOwner(ownerQuery) {
  const q = String(ownerQuery || '').toLowerCase();
  return FIN_CAPABILITY_INVENTORY.filter((e) => e.owner.toLowerCase().includes(q));
}

export function listConsumers(capabilityId = null) {
  if (capabilityId) {
    const mod = FIN_MODULE_MAP.find((m) =>
      (m.uiComponents || []).some((c) => c.toLowerCase().includes(capabilityId.replace(/_/g, '')))
    );
    return mod ? [...(mod.uiComponents || [])] : [];
  }
  return FIN_MODULE_MAP.flatMap((m) =>
    (m.uiComponents || []).map((c) => ({ moduleId: m.moduleId, consumer: c }))
  );
}

export function listProviders(capabilityId = null) {
  if (capabilityId) {
    const entry = getDiscoveryEntry(capabilityId);
    return entry ? [{ capabilityId, provider: entry.location }] : [];
  }
  return FIN_AUD_DISCOVERY_CATALOG.filter((e) => e.category === 'service' || e.category === 'api').map((e) => ({
    capabilityId: e.id,
    provider: e.location
  }));
}

export function getCapability(capabilityId) {
  const inventory = getInventoryEntry(capabilityId);
  const discovery = getDiscoveryEntry(capabilityId);
  if (!inventory && !discovery) return null;
  return Object.freeze({
    inventory,
    discovery,
    module: FIN_MODULE_MAP.find((m) => (m.backendServices || []).includes(capabilityId.replace(/_/g, ''))) || null,
    contracts: FIN_CONTRACTS_INDEX.filter((c) => String(c.contractId).includes(capabilityId.split('_')[0])),
    dependencyGraph: buildFinanceDependencyGraph()
  });
}

export function getModuleMap() {
  return [...FIN_MODULE_MAP];
}

export function getRuntimeMap() {
  return [...FIN_RUNTIME_MAP];
}

export function getRulesIndex() {
  return [...FIN_RULES_INDEX];
}

export function getContractsIndex() {
  return [...FIN_CONTRACTS_INDEX];
}

export function getCognitiveAudit() {
  return [...FIN_COGNITIVE_CAPABILITIES];
}

export function getDependencyGraph(scope = 'all') {
  return buildFinanceDependencyGraph(scope);
}

export function getGapAnalysisReport() {
  return getGapAnalysis();
}

export function validateFinAud001Integrity() {
  const discovery = validateDiscoveryIndex();
  const gap = validateGapAnalysis();
  const broken = listBrokenContracts();
  const issues = [...discovery.issues, ...gap.issues];
  return {
    valid: discovery.valid && gap.valid,
    issues,
    discoveryCount: discovery.count,
    inventoryCount: FIN_CAPABILITY_INVENTORY.length,
    brokenContracts: broken.length,
    crossDomainRefs: listCrossDomainReferences().length
  };
}

export {
  getDiscoveryEntry,
  getModuleMapEntry,
  getRuntimeEntry,
  getContractEntry,
  listCrossDomainReferences,
  listHiddenOrExperimentalModules,
  listBrokenContracts,
  listCognitiveByStatus,
  listRulesByType,
  getFinanceDependenciesForModule
};
