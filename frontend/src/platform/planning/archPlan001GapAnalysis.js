/**
 * ARCH-PLAN-001 — Gap analysis consolidada (derivada ENT-001 evolution candidates).
 */
import { getEvolutionCandidates } from '../knowledge/index.js';
import { ARCH_PLAN_001_PHASE } from './archPlan001Constants.js';

export function buildConsolidatedGapAnalysis() {
  const evo = getEvolutionCandidates();

  return Object.freeze(
    evo.domainCandidates.map((c) =>
      Object.freeze({
        domainId: c.domainId,
        label: c.label,
        maturity: c.maturity,
        whatExists: Object.freeze([...(c.whatExists || [])]),
        whatNeedsIntegration: Object.freeze([...(c.whatNeedsIntegration || [])]),
        whatMustBeDeveloped: Object.freeze([...(c.whatMustBeDeveloped || [])]),
        integrationOnly:
          (c.whatNeedsIntegration?.length || 0) > 0 && (c.whatMustBeDeveloped?.length || 0) === 0,
        developmentRequired: (c.whatMustBeDeveloped?.length || 0) > 0,
        gapSummary: Object.freeze({
          existsCount: c.whatExists?.length || 0,
          integrationGapCount: c.whatNeedsIntegration?.length || 0,
          developmentGapCount: c.whatMustBeDeveloped?.length || 0
        }),
        source: 'ENT-001 evolution candidates + FIN-AUD gap analysis'
      })
    )
  );
}

export const ARCH_GAP_ANALYSIS = buildConsolidatedGapAnalysis();

export const ARCH_PLATFORM_GAPS = Object.freeze({
  recoveryPending: Object.freeze([...(getEvolutionCandidates().recoveryPending || [])]),
  cplAdaptersPending: Object.freeze([...(getEvolutionCandidates().cplAdaptersPending || [])]),
  reg002Completed: Object.freeze([...(getEvolutionCandidates().reg002Completed || [])])
});

export function getGapEntry(domainId) {
  return ARCH_GAP_ANALYSIS.find((g) => g.domainId === domainId) ?? null;
}

export function validateGapAnalysis() {
  const issues = [];
  const finance = getGapEntry('finance');
  if (!finance || !finance.developmentRequired) {
    issues.push('finance must document development gaps');
  }
  if (!finance?.whatExists?.length) {
    issues.push('finance must document existing capabilities');
  }
  return {
    valid: issues.length === 0,
    issues,
    phase: ARCH_PLAN_001_PHASE,
    count: ARCH_GAP_ANALYSIS.length,
    recoveryPending: ARCH_PLATFORM_GAPS.recoveryPending.length
  };
}
