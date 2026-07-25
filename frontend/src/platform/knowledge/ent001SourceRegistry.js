/**
 * ENT-001 — Registo de fontes consolidadas (referências aos programas concluídos).
 */
import { ENT_001_PHASE, ENT_SOURCE_PROGRAMS } from './ent001Constants.js';

export const ENT_SOURCE_ARTIFACTS = Object.freeze({
  cpl: Object.freeze({
    discovery: 'frontend/src/platform/cognitive/discovery/cognitiveDiscoveryIndex.js',
    registry: 'frontend/src/platform/cognitive/registry/cognitivePlatformRegistry.js',
    governance: 'frontend/src/platform/cognitive/governance/',
    evidence: 'frontend/docs/evidence/CPL-001-*.md … CPL-003-*.md'
  }),
  finAud: Object.freeze({
    audit: 'frontend/src/platform/audit/finance/',
    docs: 'frontend/docs/audits/finance/FIN-AUD-001-*.md',
    tests: 'npm run test:fin-aud001'
  }),
  reg: Object.freeze({
    reg001: 'frontend/src/platform/audit/regression/reg001*.js',
    reg002: 'frontend/src/platform/audit/regression/reg002*.js',
    docs: 'frontend/docs/audits/regression/ + frontend/docs/evidence/REG-002/',
    tests: 'npm run test:reg001 && npm run test:reg002'
  }),
  eox: Object.freeze({
    registry: 'frontend/src/presentation/eox/eoxRegistry.js',
    tokens: 'frontend/src/presentation/eox/eoxTokens.js'
  }),
  domainRegistry: Object.freeze({
    frontend: 'frontend/src/domains/domainRegistry.js',
    wmsModules: 'frontend/src/domains/logistics-operational/routes/wmsModuleRegistry.js'
  }),
  opm: Object.freeze({
    evidence: 'frontend/docs/evidence/OPM-*.md',
    wmsBaseline: 'frontend/src/platform/cognitive/registry/cognitivePlatformRegistry.js → WMS_ENTERPRISE_BASELINE'
  })
});

export function listSourcePrograms() {
  return ENT_SOURCE_PROGRAMS.map((p) => ({ ...p }));
}

export function getSourceArtifacts() {
  return { phase: ENT_001_PHASE, artifacts: ENT_SOURCE_ARTIFACTS };
}
