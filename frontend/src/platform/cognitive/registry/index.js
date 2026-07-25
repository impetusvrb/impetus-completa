export {
  CPL_REGISTRY_PHASE,
  CPL_REGISTRY_VERSION,
  COGNITIVE_PLATFORM_REGISTRY,
  COGNITIVE_ADAPTER_REGISTRY,
  WMS_ENTERPRISE_BASELINE,
  getCognitiveCapability,
  getCognitiveAdapterRegistryEntry,
  listCapabilitiesByDomain,
  validateCpl001RegistryIntegrity,
  validateCpl002RegistryIntegrity
} from './cognitivePlatformRegistry.js';

export {
  COGNITIVE_CONTRACT_DESCRIPTORS,
  COGNITIVE_CONTRACT_IDS,
  getCognitiveContract
} from '../contracts/cognitiveContractDescriptors.js';

export {
  COGNITIVE_DISCOVERY_CATALOG,
  COGNITIVE_DISCOVERY_CATEGORIES,
  getDiscoveryEntry,
  listDiscoveryByDomain
} from '../discovery/cognitiveDiscoveryIndex.js';
