/**
 * FIN-PLAN-001 — Finance Capability Packages (read-only).
 * Consumes FIN-CONCEPT-001 assessments — no product implementation.
 */
import {
  FIN_CONCEPT_001_CAPABILITIES,
  getCapabilityAssessment,
  ROADMAP_CLASS
} from '../fin-concept-001/finConcept001AssessmentCatalog.js';

export const FIN_PLAN_001_PHASE = 'FIN-PLAN-001';
export const FIN_PLAN_001_PRINCIPLE = 'DELIVER CAPABILITIES, NOT MODULES';
export const FIN_PLAN_001_SCOPE = Object.freeze({
  implementsFeatures: false,
  modifiesCode: false,
  createsModules: false,
  createsServices: false,
  planningOnly: true
});

export const FIN_PLAN_001_SOURCES = Object.freeze([
  'PLATFORM-2026.1',
  'ARCH-PLAN-001',
  'FIN-CONCEPT-001',
  'FIN-EVOLVE-001',
  'FIN-EVOLVE-001A'
]);

/** Official delivery sequence (planning — not architecture roadmap). */
export const FIN_PLAN_001_PROGRAM_SEQUENCE = Object.freeze([
  'FIN-EVOLVE-001A',
  'FIN-STAB-001',
  'FIN-CONCEPT-001',
  'FIN-PLAN-001',
  'FIN-EVOLVE-002'
]);

/**
 * Capability packages → incremental product releases.
 * IDs align to FIN-CONCEPT-001 capability ids.
 */
export const FINANCE_CAPABILITY_PACKAGES = Object.freeze([
  Object.freeze({
    id: 'finance_release_2_0',
    releaseId: '2.0',
    name: 'Finance Release 2.0',
    title: 'Visão executiva do Diretor Financeiro',
    objective:
      'Fortalecer a visão executiva do Diretor Financeiro com dashboards, KPIs e alertas — sem módulos novos.',
    capabilityIds: Object.freeze([
      'role_based_dashboards',
      'executive_financial_kpis',
      'smart_financial_alerts'
    ]),
    expectedReuse: Object.freeze([
      'EOX Finance',
      'RBAC VIEW_FINANCIAL',
      'OPM-008 / Centro Comando patterns',
      'Recommendation Engine / AIOI',
      'Contextual Modules (financial_intelligence)'
    ]),
    allowsNewModules: false,
    backlog: false,
    risk: 'low',
    conceptClass: ROADMAP_CLASS.IMMEDIATE_REUSE
  }),
  Object.freeze({
    id: 'finance_release_2_1',
    releaseId: '2.1',
    name: 'Finance Release 2.1',
    title: 'Inteligência económica operacional',
    objective:
      'Transformar custos operacionais em inteligência económica (Smart Costing + Performance Económica).',
    capabilityIds: Object.freeze(['smart_costing', 'economic_performance']),
    expectedReuse: Object.freeze([
      'industrialCostService',
      'industrialCostImpactService',
      'unifiedCostControlService',
      'Logistics / WMS signals (drivers)',
      'IoT / PLC telemetry',
      'economicPressureIndexEngine',
      'operationalEconomicImpactEngine'
    ]),
    allowsNewModules: false,
    backlog: false,
    risk: 'medium',
    conceptClass: ROADMAP_CLASS.INCREMENTAL_EXPANSION
  }),
  Object.freeze({
    id: 'finance_release_2_2',
    releaseId: '2.2',
    name: 'Finance Release 2.2',
    title: 'Financial Digital Twin & cenários',
    objective:
      'Transformar o Digital Twin existente em apoio financeiro à decisão (projeções + what-if) — proibido novo simulador.',
    capabilityIds: Object.freeze([
      'financial_digital_twin',
      'scenario_planning_whatif'
    ]),
    expectedReuse: Object.freeze([
      'digitalTwinService / Applied / organizational twin',
      'DigitalTwinPanel (Centro Cognitivo)',
      'CPL ScenarioProvider',
      'OPM-008 what-if pattern',
      'operationalForecastingService',
      'Recommendation Engine',
      'Centro Cognitivo / EOX'
    ]),
    allowsNewModules: false,
    backlog: false,
    risk: 'medium_high',
    conceptClass: ROADMAP_CLASS.INCREMENTAL_EXPANSION,
    forbidden: Object.freeze(['new_financial_simulator', 'parallel_twin_engine'])
  }),
  Object.freeze({
    id: 'finance_release_2_3',
    releaseId: '2.3',
    name: 'Finance Release 2.3',
    title: 'Operação ↔ Finanças',
    objective:
      'Conectar operação e finanças: inventário $, PdM financeira, NL e inteligência operacional financeira.',
    capabilityIds: Object.freeze([
      'inventory_financial_optimization',
      'predictive_maintenance_financial',
      'natural_language_analysis'
    ]),
    expectedReuse: Object.freeze([
      'Supply / BudgetReference',
      'WMS inventory (adapters only)',
      'OPM',
      'ManuIA / Digital Twin',
      'IA / chat / smartPanel / ANAM',
      'Agentes cognitivos / AIOI'
    ]),
    allowsNewModules: false,
    backlog: false,
    risk: 'medium',
    conceptClass: ROADMAP_CLASS.INCREMENTAL_EXPANSION
  }),
  Object.freeze({
    id: 'finance_strategic_backlog',
    releaseId: 'backlog',
    name: 'Backlog Estratégico',
    title: 'Capacidades greenfield adiadas',
    objective:
      'Manter CAPEX/OPEX e Consolidação Gerencial fora do caminho crítico até validação dos releases 2.0–2.3.',
    capabilityIds: Object.freeze(['capex_opex_investment', 'managerial_consolidation']),
    expectedReuse: Object.freeze([
      'Supply ApprovalPolicyService (vestigial CAPEX)',
      'BudgetReference (analogy only)',
      'future finance_native (ARCH-PLAN Fase C)'
    ]),
    allowsNewModules: true,
    backlog: true,
    risk: 'high',
    conceptClass: ROADMAP_CLASS.NEW_MODULE
  })
]);

export function getCapabilityPackage(packageId) {
  return FINANCE_CAPABILITY_PACKAGES.find((p) => p.id === packageId) ?? null;
}

export function getPackageByReleaseId(releaseId) {
  return FINANCE_CAPABILITY_PACKAGES.find((p) => p.releaseId === String(releaseId)) ?? null;
}

export function listActiveReleasePackages() {
  return FINANCE_CAPABILITY_PACKAGES.filter((p) => !p.backlog);
}

export function resolvePackageCapabilities(packageId) {
  const pkg = getCapabilityPackage(packageId);
  if (!pkg) return [];
  return pkg.capabilityIds.map((id) => getCapabilityAssessment(id)).filter(Boolean);
}

export function validateFinanceCapabilityPackages() {
  const issues = [];
  const conceptIds = new Set(FIN_CONCEPT_001_CAPABILITIES.map((c) => c.id));
  const covered = new Set();
  for (const pkg of FINANCE_CAPABILITY_PACKAGES) {
    for (const id of pkg.capabilityIds) {
      if (!conceptIds.has(id)) issues.push(`unknown capability ${id} in ${pkg.id}`);
      if (covered.has(id)) issues.push(`capability ${id} duplicated across packages`);
      covered.add(id);
    }
  }
  for (const id of conceptIds) {
    if (!covered.has(id)) issues.push(`FIN-CONCEPT capability ${id} not assigned to a package`);
  }
  const active = listActiveReleasePackages();
  if (active.length !== 4) issues.push('expected exactly 4 active releases (2.0–2.3)');
  const backlog = getCapabilityPackage('finance_strategic_backlog');
  if (!backlog?.backlog) issues.push('strategic backlog package required');
  return { valid: issues.length === 0, issues, coveredCount: covered.size };
}
