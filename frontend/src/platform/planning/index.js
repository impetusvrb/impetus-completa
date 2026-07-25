/**
 * ARCH-PLAN-001 — Enterprise Evolution Planning.
 *
 * Planeamento read-only derivado exclusivamente de ENT-001.
 * Não implementa funcionalidades. Não altera domínios certificados.
 */
export {
  ARCH_PLAN_001_PHASE,
  ARCH_PLAN_001_VERSION,
  ARCH_PLAN_001_PRINCIPLE,
  ARCH_PLAN_001_GENERATED_AT,
  ARCH_PLAN_001_BASELINE,
  EVOLUTION_STRATEGIES,
  FROZEN_PROGRAMS
} from './archPlan001Constants.js';

export {
  ARCH_DOMAIN_ANALYSIS,
  buildDomainAnalysis,
  getDomainAnalysis,
  listDomainsByValueRisk,
  validateDomainAnalysis
} from './archPlan001DomainAnalysis.js';

export {
  ARCH_DEPENDENCY_MAP,
  buildDependencyMap,
  getDependencyEntry,
  validateDependencyMap
} from './archPlan001DependencyMap.js';

export {
  ARCH_REUSE_ANALYSIS,
  buildReuseAnalysis,
  getReuseEntry,
  listDomainsByReuse,
  validateReuseAnalysis
} from './archPlan001ReuseAnalysis.js';

export {
  ARCH_GAP_ANALYSIS,
  ARCH_PLATFORM_GAPS,
  buildConsolidatedGapAnalysis,
  getGapEntry,
  validateGapAnalysis
} from './archPlan001GapAnalysis.js';

export {
  ARCH_EVOLUTION_STRATEGIES,
  buildEvolutionStrategies,
  getEvolutionStrategy,
  listDomainsByStrategy,
  validateEvolutionStrategies
} from './archPlan001EvolutionStrategies.js';

export {
  ARCH_CORPORATE_ROADMAP,
  buildCorporateRoadmap,
  getRoadmapItem,
  validateRoadmap
} from './archPlan001Roadmap.js';

export {
  ARCH_PLANNING_API_PHASE,
  getDomainAnalysisReport,
  getDependencyMap,
  getReuseAnalysisReport,
  getConsolidatedGapAnalysis,
  getEvolutionStrategiesReport,
  getCorporateRoadmap,
  getPlanningExecutiveSummary,
  validateArchPlan001Integrity
} from './archPlan001PlanningApi.js';
