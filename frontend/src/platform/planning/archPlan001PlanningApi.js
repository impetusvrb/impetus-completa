/**
 * ARCH-PLAN-001 — Planning API (read-only · consome ENT-001 exclusivamente).
 */
import {
  ARCH_PLAN_001_PHASE,
  ARCH_PLAN_001_VERSION,
  ARCH_PLAN_001_PRINCIPLE,
  ARCH_PLAN_001_BASELINE,
  FROZEN_PROGRAMS,
  EVOLUTION_STRATEGIES
} from './archPlan001Constants.js';
import {
  ARCH_DOMAIN_ANALYSIS,
  getDomainAnalysis,
  listDomainsByValueRisk,
  validateDomainAnalysis
} from './archPlan001DomainAnalysis.js';
import {
  ARCH_DEPENDENCY_MAP,
  getDependencyEntry,
  validateDependencyMap
} from './archPlan001DependencyMap.js';
import {
  ARCH_REUSE_ANALYSIS,
  getReuseEntry,
  listDomainsByReuse,
  validateReuseAnalysis
} from './archPlan001ReuseAnalysis.js';
import {
  ARCH_GAP_ANALYSIS,
  ARCH_PLATFORM_GAPS,
  getGapEntry,
  validateGapAnalysis
} from './archPlan001GapAnalysis.js';
import {
  ARCH_EVOLUTION_STRATEGIES,
  getEvolutionStrategy,
  listDomainsByStrategy,
  validateEvolutionStrategies
} from './archPlan001EvolutionStrategies.js';
import {
  ARCH_CORPORATE_ROADMAP,
  getRoadmapItem,
  validateRoadmap
} from './archPlan001Roadmap.js';
import { validateEnt001Integrity } from '../knowledge/index.js';

export const ARCH_PLANNING_API_PHASE = ARCH_PLAN_001_PHASE;

export function getDomainAnalysisReport() {
  return [...ARCH_DOMAIN_ANALYSIS];
}

export function getDependencyMap() {
  return [...ARCH_DEPENDENCY_MAP];
}

export function getReuseAnalysisReport() {
  return [...ARCH_REUSE_ANALYSIS];
}

export function getConsolidatedGapAnalysis() {
  return [...ARCH_GAP_ANALYSIS];
}

export function getEvolutionStrategiesReport() {
  return [...ARCH_EVOLUTION_STRATEGIES];
}

export function getCorporateRoadmap() {
  return ARCH_CORPORATE_ROADMAP;
}

export function getPlanningExecutiveSummary() {
  const byStrategy = EVOLUTION_STRATEGIES.reduce((acc, st) => {
    acc[st] = listDomainsByStrategy(st).map((d) => d.domainId);
    return acc;
  }, {});

  return Object.freeze({
    phase: ARCH_PLAN_001_PHASE,
    version: ARCH_PLAN_001_VERSION,
    principle: ARCH_PLAN_001_PRINCIPLE,
    baseline: ARCH_PLAN_001_BASELINE,
    frozenPrograms: FROZEN_PROGRAMS,
    question: 'Qual é a forma correta de evoluir cada domínio?',
    answer: Object.freeze({
      totalDomains: ARCH_DOMAIN_ANALYSIS.length,
      strategiesByDomain: byStrategy,
      rank1Domain: ARCH_CORPORATE_ROADMAP.implementationSequence[0]?.domainId,
      rank1Strategy: ARCH_CORPORATE_ROADMAP.implementationSequence[0]?.strategy,
      rank1Not: 'FIN-001 greenfield directo',
      preservationDomains: ARCH_CORPORATE_ROADMAP.preservationDomains.map((d) => d.domainId),
      topReuse: listDomainsByReuse()
        .slice(0, 5)
        .map((d) => ({ domainId: d.domainId, reuse: d.reuseEstimatePercent })),
      topValueRisk: listDomainsByValueRisk()
        .slice(0, 5)
        .map((d) => ({ domainId: d.domainId, score: d.scores.valueRiskRatio }))
    }),
    nextStep: ARCH_CORPORATE_ROADMAP.nextAction
  });
}

export function validateArchPlan001Integrity() {
  const entCheck = validateEnt001Integrity();
  const checks = [
    entCheck,
    validateDomainAnalysis(),
    validateDependencyMap(),
    validateReuseAnalysis(),
    validateGapAnalysis(),
    validateEvolutionStrategies(),
    validateRoadmap()
  ];
  const issues = checks.flatMap((c) => c.issues || []);
  if (!entCheck.valid) issues.push('ENT-001 baseline must remain valid');

  return {
    valid: checks.every((c) => c.valid !== false) && issues.length === 0,
    issues,
    phase: ARCH_PLAN_001_PHASE,
    principle: ARCH_PLAN_001_PRINCIPLE,
    baseline: ARCH_PLAN_001_BASELINE,
    ent001Valid: entCheck.valid,
    checks: Object.freeze(
      checks.map((c) => ({
        valid: c.valid,
        count: c.count || c.implementationCount || c.rowCount
      }))
    )
  };
}

export {
  ARCH_PLAN_001_PHASE,
  ARCH_PLAN_001_VERSION,
  ARCH_PLAN_001_PRINCIPLE,
  getDomainAnalysis,
  getDependencyEntry,
  getReuseEntry,
  getGapEntry,
  getEvolutionStrategy,
  getRoadmapItem,
  ARCH_PLATFORM_GAPS
};
