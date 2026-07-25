/**
 * PLATFORM-2026.1 — Baseline Oficial (consolida ENT-001 + ARCH-PLAN-001).
 */
import {
  getBaseline,
  getExecutiveSummary,
  validateEnt001Integrity,
  ENT_001_PHASE
} from '../knowledge/index.js';
import {
  validateArchPlan001Integrity,
  ARCH_PLAN_001_PHASE
} from '../planning/index.js';
import {
  PLATFORM_RELEASE_ID,
  PLATFORM_RELEASE_VERSION,
  PLATFORM_RELEASE_PRINCIPLE,
  PLATFORM_RELEASE_DATE,
  PLATFORM_RELEASE_STATUS,
  PLATFORM_EVOLUTION_PIPELINE
} from './platformRelease2026Constants.js';

/** Programas concluídos que compõem a baseline release */
export const PLATFORM_CERTIFIED_PROGRAMS = Object.freeze({
  foundation: Object.freeze([
    'BASELINE-SYSTEM',
    'ARC-001',
    'ARC-003A',
    'GF-014',
    'GF-026',
    'NAV-001',
    'NAV-002A',
    'EOX'
  ]),
  operational: Object.freeze([
    'WMS-001',
    'WMS-007A',
    'WMS-REF-001',
    'OPM-001',
    'OPM-008',
    'OPM-E2E-001',
    'OPM-GOV-001'
  ]),
  cognitive: Object.freeze(['CPL-001', 'CPL-002', 'CPL-003']),
  governance: Object.freeze(['AUD-001', 'EV-001']),
  discoveryAudit: Object.freeze([
    'FIN-AUD-001',
    'REG-001',
    'REG-002',
    ENT_001_PHASE,
    ARCH_PLAN_001_PHASE
  ])
});

/** Componentes certificados — referência declarativa */
export const PLATFORM_CERTIFIED_COMPONENTS = Object.freeze({
  architecture: Object.freeze([
    'presentation/eox/eoxRegistry.js',
    'presentation/operational-navigation/',
    'domains/domainRegistry.js'
  ]),
  operational: Object.freeze([
    'domains/logistics-operational/ (WMS Enterprise Baseline)',
    'OPM-GOV-001 operational contracts',
    'WMS-REF-001 reference components'
  ]),
  cognitive: Object.freeze([
    'platform/cognitive/discovery/',
    'platform/cognitive/registry/',
    'platform/cognitive/governance/',
    'platform/cognitive/adapters/ (logistics, quality, safety, environment)'
  ]),
  audit: Object.freeze([
    'platform/audit/finance/ (FIN-AUD-001)',
    'platform/audit/regression/ (REG-001, REG-002)'
  ]),
  knowledge: Object.freeze([
    'platform/knowledge/ (ENT-001)',
    'platform/planning/ (ARCH-PLAN-001)'
  ])
});

/** Contratos congelados */
export const PLATFORM_FROZEN_CONTRACTS = Object.freeze([
  Object.freeze({ id: 'movement_lifecycle', domain: 'logistics_wms', source: 'OPM-GOV-001' }),
  Object.freeze({ id: 'handoff_baseline', domain: 'logistics_wms', source: 'OPM-GOV-001' }),
  Object.freeze({ id: 'cognitive_contract_descriptors', domain: 'platform', source: 'CPL-001' }),
  Object.freeze({ id: 'eox_navigation_config', domain: 'platform', source: 'EOX/NAV' }),
  Object.freeze({ id: 'wms_module_registry', domain: 'logistics_wms', source: 'WMS-REF-001' }),
  Object.freeze({ id: 'dashboard_profiles', domain: 'command_center', source: 'ARC/UX' }),
  Object.freeze({ id: 'view_financial_rbac', domain: 'platform_governance', source: 'FIN-AUD-001' })
]);

/** Estado consolidado da plataforma */
export const PLATFORM_STATE_SUMMARY = Object.freeze([
  Object.freeze({ area: 'Arquitetura', state: 'Certificada' }),
  Object.freeze({ area: 'Navegação', state: 'Certificada' }),
  Object.freeze({ area: 'Plataforma Cognitiva', state: 'Congelada' }),
  Object.freeze({ area: 'Runtime', state: 'Estável' }),
  Object.freeze({ area: 'WMS', state: 'Certificado' }),
  Object.freeze({ area: 'Governança', state: 'Consolidada' }),
  Object.freeze({ area: 'Auditorias', state: 'Concluídas' }),
  Object.freeze({ area: 'Recuperação', state: 'Concluída' }),
  Object.freeze({ area: 'Planejamento', state: 'Aprovado' }),
  Object.freeze({ area: 'Baseline Release', state: 'Publicada' })
]);

export function buildPlatformBaseline() {
  const entBaseline = getBaseline();
  const entSummary = getExecutiveSummary();

  return Object.freeze({
    releaseId: PLATFORM_RELEASE_ID,
    version: PLATFORM_RELEASE_VERSION,
    principle: PLATFORM_RELEASE_PRINCIPLE,
    releaseDate: PLATFORM_RELEASE_DATE,
    status: PLATFORM_RELEASE_STATUS,
    readyForDomainEvolution: true,
    evolutionPipeline: PLATFORM_EVOLUTION_PIPELINE,
    sourceBaselines: Object.freeze([ENT_001_PHASE, ARCH_PLAN_001_PHASE]),
    certifiedPrograms: PLATFORM_CERTIFIED_PROGRAMS,
    certifiedComponents: PLATFORM_CERTIFIED_COMPONENTS,
    frozenContracts: PLATFORM_FROZEN_CONTRACTS,
    platformState: PLATFORM_STATE_SUMMARY,
    inventory: entBaseline.summary,
    executiveAnswer: entSummary.answer,
    architecture: Object.freeze({
      current: 'Industrial 4.0 · EOX presentation · CPL cognitive platform',
      navigation: 'NAV-002A + EOX breadcrumb hierarchy',
      cognitive: 'CPL-003 governance — adapters thin, registry frozen',
      operational: 'WMS Enterprise Baseline — OPM-003 through OPM-008 certified'
    }),
    infrastructure: Object.freeze({
      frontend: 'React · domainRegistry · EOX · cognitiveRuntime',
      backend: 'Express · dashboard routes · contextualModules · cognitiveRuntime',
      registries: Object.freeze([
        'eoxRegistry',
        'domainRegistry',
        'wmsModuleRegistry',
        'cognitivePlatformRegistry',
        'contextualModules/moduleRegistry'
      ])
    })
  });
}

export const PLATFORM_2026_BASELINE = buildPlatformBaseline();

export function getPlatformBaseline() {
  return PLATFORM_2026_BASELINE;
}

export function validatePlatformBaseline() {
  const ent = validateEnt001Integrity();
  const plan = validateArchPlan001Integrity();
  const issues = [...(ent.issues || []), ...(plan.issues || [])];

  if (!PLATFORM_2026_BASELINE.readyForDomainEvolution) {
    issues.push('platform not marked ready for domain evolution');
  }
  const programCount =
    PLATFORM_CERTIFIED_PROGRAMS.foundation.length +
    PLATFORM_CERTIFIED_PROGRAMS.operational.length +
    PLATFORM_CERTIFIED_PROGRAMS.cognitive.length +
    PLATFORM_CERTIFIED_PROGRAMS.governance.length +
    PLATFORM_CERTIFIED_PROGRAMS.discoveryAudit.length;
  if (programCount < 20) issues.push('incomplete certified program list');

  return {
    valid: ent.valid && plan.valid && issues.length === 0,
    issues,
    releaseId: PLATFORM_RELEASE_ID,
    ent001Valid: ent.valid,
    archPlanValid: plan.valid,
    programCount
  };
}
