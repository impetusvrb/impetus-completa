/**
 * ARCH-PLAN-001 — Roadmap corporativo priorizado (evidência ENT-001).
 */
import { ARCH_EVOLUTION_STRATEGIES } from './archPlan001EvolutionStrategies.js';
import { ARCH_DEPENDENCY_MAP } from './archPlan001DependencyMap.js';
import { ARCH_REUSE_ANALYSIS } from './archPlan001ReuseAnalysis.js';
import { ARCH_GAP_ANALYSIS } from './archPlan001GapAnalysis.js';
import { ARCH_PLAN_001_PHASE, ARCH_PLAN_001_PRINCIPLE, FROZEN_PROGRAMS } from './archPlan001Constants.js';

/** Ordem de implementação — domínios evolutivos apenas (exclui maintenance_only) */
const ROADMAP_SEQUENCE = Object.freeze([
  Object.freeze({
    rank: 1,
    domainId: 'finance',
    programPlaceholder: 'FIN-EVOLVE-001',
    horizon: 'Q3-Q4',
    prerequisite: Object.freeze(['ENT-001', 'REG-002', 'FIN-AUD-001']),
    risks: Object.freeze(['Recriar leakage/custos existentes', 'Confundir Nexus billing com ERP']),
    expectedReuse: Object.freeze([
      'industrialCostService',
      'financialLeakageDetectorService',
      'contextualModules',
      'Nexus billing',
      'VIEW_FINANCIAL'
    ]),
    deliverable: 'Integração fase A + roadmap finance_native scoped'
  }),
  Object.freeze({
    rank: 2,
    domainId: 'supply',
    programPlaceholder: 'SUP-RECOVER-001',
    horizon: 'Q4',
    prerequisite: Object.freeze(['logistics_wms certified', 'OPM-008']),
    risks: Object.freeze(['Duplicar WMS logistics', 'EOX divergence']),
    expectedReuse: Object.freeze(['logistics_adapter', 'OPM-008 cognitive handoff', 'supply workspace']),
    deliverable: 'EOX activo + rotas supply'
  }),
  Object.freeze({
    rank: 3,
    domainId: 'ppap',
    programPlaceholder: 'QTY-PPAP-RECOVER-001',
    horizon: 'Q4',
    prerequisite: Object.freeze(['quality mature', 'command_center']),
    risks: Object.freeze(['Reimplementar cockpit CC']),
    expectedReuse: Object.freeze(['PpapNativeCockpitPromotion', 'specialized_cockpit_resolver']),
    deliverable: 'Cockpit ligado a EOX quality'
  }),
  Object.freeze({
    rank: 4,
    domainId: 'msa',
    programPlaceholder: 'QTY-MSA-RECOVER-001',
    horizon: 'Q4-Q1',
    prerequisite: Object.freeze(['quality mature', 'ppap recover pattern']),
    risks: Object.freeze(['Cockpit duplicado']),
    expectedReuse: Object.freeze(['MsaNativeCockpitPromotion']),
    deliverable: 'MSA EOX + routes'
  }),
  Object.freeze({
    rank: 5,
    domainId: 'ishikawa',
    programPlaceholder: 'QTY-ISHI-RECOVER-001',
    horizon: 'Q1',
    prerequisite: Object.freeze(['quality mature']),
    risks: Object.freeze(['Rebuild Ishikawa engine']),
    expectedReuse: Object.freeze(['IshikawaNativeCockpitPromotion', 'quality_governance_ui_engine']),
    deliverable: 'Ishikawa EOX + routes'
  }),
  Object.freeze({
    rank: 6,
    domainId: 'purchasing',
    programPlaceholder: 'PROC-RECOVER-001',
    horizon: 'Q1',
    prerequisite: Object.freeze(['supply recover']),
    risks: Object.freeze(['BudgetReference scope creep']),
    expectedReuse: Object.freeze(['Supply BudgetReference', 'finance cross-ref']),
    deliverable: 'Procurement integrado supply/finance'
  }),
  Object.freeze({
    rank: 7,
    domainId: 'executive',
    programPlaceholder: 'EXEC-INTEGRATE-001',
    horizon: 'Q1-Q2',
    prerequisite: Object.freeze(['finance phase A', 'command_center']),
    risks: Object.freeze(['Fragmentação AIOI']),
    expectedReuse: Object.freeze(['cognitive_economics', 'executive widgets']),
    deliverable: 'Executive hub consolidado'
  }),
  Object.freeze({
    rank: 8,
    domainId: 'production',
    programPlaceholder: 'PRD-GREENFIELD-001',
    horizon: 'Q2+',
    prerequisite: Object.freeze(['supply', 'finance phase A', 'MES audit mínimo']),
    risks: Object.freeze(['GREENFIELD prematuro', 'Duplicar industrial map']),
    expectedReuse: Object.freeze(['industrial_operational_map', 'MES/ERP refs']),
    deliverable: 'Production operational runtime scoped'
  }),
  Object.freeze({
    rank: 9,
    domainId: 'maintenance',
    programPlaceholder: 'MNT-GREENFIELD-001',
    horizon: 'Q3+',
    prerequisite: Object.freeze(['production']),
    risks: Object.freeze(['Sem baseline OPM reference']),
    expectedReuse: Object.freeze(['operational patterns']),
    deliverable: 'Maintenance domain GREENFIELD'
  }),
  Object.freeze({
    rank: 10,
    domainId: 'hr',
    programPlaceholder: 'HR-GREENFIELD-001',
    horizon: 'Q4+',
    prerequisite: Object.freeze([]),
    risks: Object.freeze(['Priorização prematura']),
    expectedReuse: Object.freeze([]),
    deliverable: 'HR domain scoped discovery + GREENFIELD'
  }),
  Object.freeze({
    rank: 11,
    domainId: 'compliance',
    programPlaceholder: 'COMP-INTEGRATE-001',
    horizon: 'Paralelo Q4',
    prerequisite: Object.freeze(['quality', 'safety', 'environment']),
    risks: Object.freeze(['Compliance silo']),
    expectedReuse: Object.freeze(['Q/S/E compliance views']),
    deliverable: 'Compliance governance consolidado'
  })
]);

export function buildCorporateRoadmap() {
  const items = ROADMAP_SEQUENCE.map((item) => {
    const strategy = ARCH_EVOLUTION_STRATEGIES.find((s) => s.domainId === item.domainId);
    const deps = ARCH_DEPENDENCY_MAP.find((d) => d.domainId === item.domainId);
    const reuse = ARCH_REUSE_ANALYSIS.find((r) => r.domainId === item.domainId);
    const gap = ARCH_GAP_ANALYSIS.find((g) => g.domainId === item.domainId);

    return Object.freeze({
      ...item,
      label: strategy?.label || item.domainId,
      strategy: strategy?.strategy,
      strategyRationale: strategy?.rationale,
      phases: strategy?.phases || Object.freeze([]),
      blockedBy: deps?.blockedBy || Object.freeze([]),
      blocksDomains: deps?.blocksDomains || Object.freeze([]),
      reuseEstimatePercent: reuse?.reuseEstimatePercent || 0,
      integrationGaps: gap?.whatNeedsIntegration || Object.freeze([]),
      developmentGaps: gap?.whatMustBeDeveloped || Object.freeze([])
    });
  });

  const maintenanceDomains = ARCH_EVOLUTION_STRATEGIES.filter(
    (s) => s.strategy === 'maintenance_only'
  ).map((s) =>
    Object.freeze({
      domainId: s.domainId,
      label: s.label,
      strategy: s.strategy,
      note: 'Fora do roadmap evolutivo — preservar baseline certificada'
    })
  );

  return Object.freeze({
    phase: ARCH_PLAN_001_PHASE,
    principle: ARCH_PLAN_001_PRINCIPLE,
    frozenPrograms: FROZEN_PROGRAMS,
    noNewHorizontalPrograms: true,
    implementationSequence: Object.freeze(items),
    preservationDomains: Object.freeze(maintenanceDomains),
    nextAction: Object.freeze({
      domainId: 'finance',
      strategy: 'integrate_then_develop',
      not: 'FIN-001 greenfield directo',
      meeting: 'Reunião arquitectura — validar roadmap rank 1-3'
    })
  });
}

export const ARCH_CORPORATE_ROADMAP = buildCorporateRoadmap();

export function getRoadmapItem(rankOrDomainId) {
  if (typeof rankOrDomainId === 'number') {
    return ARCH_CORPORATE_ROADMAP.implementationSequence.find((i) => i.rank === rankOrDomainId) ?? null;
  }
  return (
    ARCH_CORPORATE_ROADMAP.implementationSequence.find((i) => i.domainId === rankOrDomainId) ?? null
  );
}

export function validateRoadmap() {
  const issues = [];
  const seq = ARCH_CORPORATE_ROADMAP.implementationSequence;
  if (seq.length < 8) issues.push('roadmap too short');
  if (seq[0]?.domainId !== 'finance') issues.push('finance must be rank 1');
  if (seq[0]?.strategy !== 'integrate_then_develop') issues.push('finance strategy mismatch');
  const ranks = seq.map((i) => i.rank);
  if (new Set(ranks).size !== ranks.length) issues.push('duplicate ranks');
  return {
    valid: issues.length === 0,
    issues,
    phase: ARCH_PLAN_001_PHASE,
    implementationCount: seq.length,
    preservationCount: ARCH_CORPORATE_ROADMAP.preservationDomains.length
  };
}
