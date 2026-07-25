/**
 * ENT-001 — Knowledge API (consultas read-only · consolidação de artefactos existentes).
 */
import {
  ENT_001_PHASE,
  ENT_001_VERSION,
  ENT_001_PRINCIPLE,
  ENT_SOURCE_PROGRAMS
} from './ent001Constants.js';
import { getSourceArtifacts, listSourcePrograms } from './ent001SourceRegistry.js';
import {
  ENT_DOMAIN_CATALOG,
  getDomainEntry,
  listDomainsByMaturity,
  validateDomainCatalog
} from './ent001DomainCatalog.js';
import {
  ENT_MODULE_CATALOG,
  getModuleEntry,
  listModulesByDomain,
  validateModuleCatalog
} from './ent001ModuleCatalog.js';
import {
  ENT_RUNTIME_CATALOG,
  getRuntimeEntry,
  listRuntimesByDomain,
  validateRuntimeCatalog
} from './ent001RuntimeCatalog.js';
import {
  ENT_COGNITIVE_CATALOG,
  getCognitiveEntry,
  listCognitiveByDomain,
  validateCognitiveCatalog
} from './ent001CognitiveCatalog.js';
import { ENT_OPERATIONAL_CATALOG, validateOperationalCatalog } from './ent001OperationalCatalog.js';
import {
  ENT_INTEGRATION_CATALOG,
  listIntegrationsByStatus,
  listReg002Resolved,
  validateIntegrationCatalog
} from './ent001IntegrationCatalog.js';
import {
  ENT_CROSS_DOMAIN_MATRIX,
  getMatrixRow,
  validateCrossDomainMatrix
} from './ent001CrossDomainMatrix.js';
import {
  ENT_PLATFORM_HEATMAP,
  listHeatmapByMaturity,
  getHeatmapSummary,
  validatePlatformHeatmap
} from './ent001PlatformHeatmap.js';
import {
  ENT_EVOLUTION_CANDIDATES,
  getEvolutionCandidates,
  validateEvolutionCandidates
} from './ent001EvolutionCandidates.js';
import {
  ENT_ENTERPRISE_BASELINE,
  getEnterpriseBaseline,
  validateEnterpriseBaseline
} from './ent001EnterpriseBaseline.js';

export const ENT_KNOWLEDGE_API_PHASE = ENT_001_PHASE;

export function getBaseline() {
  return getEnterpriseBaseline();
}

export function getDomainCatalog() {
  return [...ENT_DOMAIN_CATALOG];
}

export function getModuleCatalog() {
  return [...ENT_MODULE_CATALOG];
}

export function getRuntimeCatalog() {
  return [...ENT_RUNTIME_CATALOG];
}

export function getCognitiveCatalog() {
  return [...ENT_COGNITIVE_CATALOG];
}

export function getOperationalCatalog() {
  return ENT_OPERATIONAL_CATALOG;
}

export function getIntegrationCatalog() {
  return [...ENT_INTEGRATION_CATALOG];
}

export function getCrossDomainMatrix() {
  return [...ENT_CROSS_DOMAIN_MATRIX];
}

export function getPlatformHeatmap() {
  return [...ENT_PLATFORM_HEATMAP];
}

export function getExecutiveSummary() {
  const heatmap = getHeatmapSummary();
  return Object.freeze({
    phase: ENT_001_PHASE,
    version: ENT_001_VERSION,
    principle: ENT_001_PRINCIPLE,
    question: 'O que realmente existe hoje na plataforma?',
    answer: Object.freeze({
      domains: ENT_DOMAIN_CATALOG.length,
      modules: ENT_MODULE_CATALOG.length,
      runtimes: ENT_RUNTIME_CATALOG.length,
      cognitiveCapabilities: ENT_COGNITIVE_CATALOG.length,
      integrations: ENT_INTEGRATION_CATALOG.length,
      certifiedDomains: listHeatmapByMaturity('certified').map((d) => d.domainId),
      matureDomains: listHeatmapByMaturity('mature').map((d) => d.domainId),
      partialDomains: listHeatmapByMaturity('partial').map((d) => d.domainId),
      notStartedDomains: listHeatmapByMaturity('not_started').map((d) => d.domainId),
      heatmapSummary: heatmap,
      nextRecommendedStep: 'Reunião de arquitectura com base em ENT_EVOLUTION_CANDIDATES.prioritizedDomains'
    }),
    sourcesConsolidated: ENT_SOURCE_PROGRAMS.map((p) => p.id)
  });
}

export function validateEnt001Integrity() {
  return validateEnterpriseBaseline();
}

export {
  ENT_001_PHASE,
  ENT_001_VERSION,
  ENT_001_PRINCIPLE,
  ENT_SOURCE_PROGRAMS,
  getSourceArtifacts,
  listSourcePrograms,
  getDomainEntry,
  listDomainsByMaturity,
  validateDomainCatalog,
  getModuleEntry,
  listModulesByDomain,
  validateModuleCatalog,
  getRuntimeEntry,
  listRuntimesByDomain,
  validateRuntimeCatalog,
  getCognitiveEntry,
  listCognitiveByDomain,
  validateCognitiveCatalog,
  validateOperationalCatalog,
  listIntegrationsByStatus,
  listReg002Resolved,
  validateIntegrationCatalog,
  getMatrixRow,
  validateCrossDomainMatrix,
  listHeatmapByMaturity,
  getHeatmapSummary,
  validatePlatformHeatmap,
  getEvolutionCandidates,
  validateEvolutionCandidates,
  ENT_ENTERPRISE_BASELINE,
  validateEnterpriseBaseline
};
