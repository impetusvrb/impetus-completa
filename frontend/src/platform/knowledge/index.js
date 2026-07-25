/**
 * ENT-001 — Enterprise Platform Knowledge Baseline.
 *
 * Consolidação read-only de CPL, FIN-AUD, REG, OPM, EOX.
 * Não implementa funcionalidades. Não altera domínios certificados.
 */
export {
  ENT_001_PHASE,
  ENT_001_VERSION,
  ENT_001_PRINCIPLE,
  ENT_001_GENERATED_AT,
  ENT_MATURITY_LEVELS,
  ENT_SOURCE_PROGRAMS
} from './ent001Constants.js';

export { ENT_SOURCE_ARTIFACTS, getSourceArtifacts, listSourcePrograms } from './ent001SourceRegistry.js';

export {
  ENT_DOMAIN_CATALOG,
  buildEnterpriseDomainCatalog,
  getDomainEntry,
  listDomainsByMaturity,
  validateDomainCatalog
} from './ent001DomainCatalog.js';

export {
  ENT_MODULE_CATALOG,
  buildModuleCatalog,
  getModuleEntry,
  listModulesByDomain,
  validateModuleCatalog
} from './ent001ModuleCatalog.js';

export {
  ENT_RUNTIME_CATALOG,
  buildRuntimeCatalog,
  getRuntimeEntry,
  listRuntimesByDomain,
  validateRuntimeCatalog
} from './ent001RuntimeCatalog.js';

export {
  ENT_COGNITIVE_CATALOG,
  buildCognitiveCatalog,
  getCognitiveEntry,
  listCognitiveByDomain,
  validateCognitiveCatalog
} from './ent001CognitiveCatalog.js';

export {
  ENT_OPERATIONAL_CATALOG,
  ENT_OPERATIONAL_PHASES,
  ENT_OPERATIONAL_CONTRACTS,
  buildOperationalCatalog,
  validateOperationalCatalog
} from './ent001OperationalCatalog.js';

export {
  ENT_INTEGRATION_CATALOG,
  buildIntegrationCatalog,
  listIntegrationsByStatus,
  listReg002Resolved,
  validateIntegrationCatalog
} from './ent001IntegrationCatalog.js';

export {
  ENT_CROSS_DOMAIN_MATRIX,
  buildCrossDomainMatrix,
  getMatrixRow,
  validateCrossDomainMatrix
} from './ent001CrossDomainMatrix.js';

export {
  ENT_PLATFORM_HEATMAP,
  buildPlatformHeatmap,
  listHeatmapByMaturity,
  getHeatmapSummary,
  validatePlatformHeatmap
} from './ent001PlatformHeatmap.js';

export {
  ENT_EVOLUTION_CANDIDATES,
  getEvolutionCandidates,
  validateEvolutionCandidates
} from './ent001EvolutionCandidates.js';

export {
  ENT_ENTERPRISE_BASELINE,
  getEnterpriseBaseline,
  validateEnterpriseBaseline
} from './ent001EnterpriseBaseline.js';

export {
  ENT_KNOWLEDGE_API_PHASE,
  getBaseline,
  getDomainCatalog,
  getModuleCatalog,
  getRuntimeCatalog,
  getCognitiveCatalog,
  getOperationalCatalog,
  getIntegrationCatalog,
  getCrossDomainMatrix,
  getPlatformHeatmap,
  getExecutiveSummary,
  validateEnt001Integrity
} from './ent001KnowledgeApi.js';
