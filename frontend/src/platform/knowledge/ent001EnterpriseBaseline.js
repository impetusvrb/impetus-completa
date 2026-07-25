/**
 * ENT-001 — Enterprise Baseline (visão única consolidada).
 */
import {
  ENT_001_PHASE,
  ENT_001_VERSION,
  ENT_001_PRINCIPLE,
  ENT_001_GENERATED_AT,
  ENT_SOURCE_PROGRAMS
} from './ent001Constants.js';
import { ENT_SOURCE_ARTIFACTS } from './ent001SourceRegistry.js';
import { ENT_DOMAIN_CATALOG, validateDomainCatalog } from './ent001DomainCatalog.js';
import { ENT_MODULE_CATALOG, validateModuleCatalog } from './ent001ModuleCatalog.js';
import { ENT_RUNTIME_CATALOG, validateRuntimeCatalog } from './ent001RuntimeCatalog.js';
import { ENT_COGNITIVE_CATALOG, validateCognitiveCatalog } from './ent001CognitiveCatalog.js';
import { ENT_OPERATIONAL_CATALOG, validateOperationalCatalog } from './ent001OperationalCatalog.js';
import { ENT_INTEGRATION_CATALOG, validateIntegrationCatalog } from './ent001IntegrationCatalog.js';
import { ENT_CROSS_DOMAIN_MATRIX, validateCrossDomainMatrix } from './ent001CrossDomainMatrix.js';
import { ENT_PLATFORM_HEATMAP, getHeatmapSummary, validatePlatformHeatmap } from './ent001PlatformHeatmap.js';
import { ENT_EVOLUTION_CANDIDATES, validateEvolutionCandidates } from './ent001EvolutionCandidates.js';

export const ENT_ENTERPRISE_BASELINE = Object.freeze({
  phase: ENT_001_PHASE,
  version: ENT_001_VERSION,
  principle: ENT_001_PRINCIPLE,
  generatedAt: ENT_001_GENERATED_AT,
  sourcePrograms: ENT_SOURCE_PROGRAMS,
  sourceArtifacts: ENT_SOURCE_ARTIFACTS,
  domainCatalog: ENT_DOMAIN_CATALOG,
  moduleCatalog: ENT_MODULE_CATALOG,
  runtimeCatalog: ENT_RUNTIME_CATALOG,
  cognitiveCatalog: ENT_COGNITIVE_CATALOG,
  operationalCatalog: ENT_OPERATIONAL_CATALOG,
  integrationCatalog: ENT_INTEGRATION_CATALOG,
  crossDomainMatrix: ENT_CROSS_DOMAIN_MATRIX,
  platformHeatmap: ENT_PLATFORM_HEATMAP,
  evolutionCandidates: ENT_EVOLUTION_CANDIDATES,
  summary: Object.freeze({
    domainCount: ENT_DOMAIN_CATALOG.length,
    moduleCount: ENT_MODULE_CATALOG.length,
    runtimeCount: ENT_RUNTIME_CATALOG.length,
    cognitiveCount: ENT_COGNITIVE_CATALOG.length,
    integrationCount: ENT_INTEGRATION_CATALOG.length,
    heatmapSummary: getHeatmapSummary(),
    sourceProgramCount: ENT_SOURCE_PROGRAMS.length
  }),
  closureCriteria: Object.freeze({
    canAnswerDomains: true,
    canAnswerModules: true,
    canAnswerCognitive: true,
    canAnswerRuntimes: true,
    canAnswerIntegrations: true,
    canAnswerCertified: true,
    canAnswerEvolutionGaps: true
  })
});

export function getEnterpriseBaseline() {
  return ENT_ENTERPRISE_BASELINE;
}

export function validateEnterpriseBaseline() {
  const checks = [
    validateDomainCatalog(),
    validateModuleCatalog(),
    validateRuntimeCatalog(),
    validateCognitiveCatalog(),
    validateOperationalCatalog(),
    validateIntegrationCatalog(),
    validateCrossDomainMatrix(),
    validatePlatformHeatmap(),
    validateEvolutionCandidates()
  ];
  const issues = checks.flatMap((c) => c.issues || []);
  return {
    valid: checks.every((c) => c.valid !== false) && issues.length === 0,
    issues,
    phase: ENT_001_PHASE,
    principle: ENT_001_PRINCIPLE,
    summary: ENT_ENTERPRISE_BASELINE.summary,
    checks: Object.freeze(checks.map((c) => ({ valid: c.valid, count: c.count || c.rowCount || c.phaseCount })))
  };
}
