/**
 * FIN-AUD-001 — Finance Domain Discovery & Architectural Audit.
 *
 * Read-only audit artifacts. No business logic. No domain modifications.
 */
export {
  FIN_AUD_001_PHASE,
  FIN_AUD_001_VERSION,
  FIN_AUD_001_PRINCIPLE,
  FIN_AUD_SEARCH_TERMS,
  FINANCE_DOMAIN_STATUS,
  FIN_AUD_DISCOVERY_CATALOG,
  getDiscoveryEntry,
  listCrossDomainReferences,
  validateDiscoveryIndex
} from './finAud001DiscoveryIndex.js';

export {
  FIN_CAPABILITY_INVENTORY,
  getInventoryEntry,
  listInventoryByDomain,
  listInventoryByMaturity,
  validateInventoryIntegrity
} from './finAud001CapabilityInventory.js';

export {
  FIN_MODULE_MAP,
  getModuleMapEntry,
  listModulesByMaturity,
  listHiddenOrExperimentalModules,
  validateModuleMapIntegrity
} from './finAud001ModuleMap.js';

export {
  FIN_RUNTIME_MAP,
  getRuntimeEntry,
  validateRuntimeMapIntegrity
} from './finAud001RuntimeMap.js';

export { FIN_RULES_INDEX, listRulesByType, validateRulesIndex } from './finAud001RulesIndex.js';

export {
  FIN_CONTRACTS_INDEX,
  getContractEntry,
  listBrokenContracts,
  validateContractsIndex
} from './finAud001ContractsIndex.js';

export {
  FIN_COGNITIVE_CAPABILITIES,
  listCognitiveByStatus,
  validateCognitiveAudit
} from './finAud001CognitiveAudit.js';

export {
  buildFinanceDependencyGraph,
  getFinanceDependenciesForModule
} from './finAud001DependencyGraph.js';

export { FIN_GAP_ANALYSIS, getGapAnalysis, validateGapAnalysis } from './finAud001GapAnalysis.js';

export {
  FIN_AUDIT_API_PHASE,
  listCapabilities,
  listByDomain,
  listByStatus,
  listByOwner,
  listConsumers,
  listProviders,
  getCapability,
  getModuleMap,
  getRuntimeMap,
  getRulesIndex,
  getContractsIndex,
  getCognitiveAudit,
  getDependencyGraph,
  getGapAnalysisReport,
  validateFinAud001Integrity
} from './finAud001AuditApi.js';
