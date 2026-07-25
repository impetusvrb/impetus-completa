/**
 * FIN-PLAN-001 — Planning API (read-only façade).
 */
import {
  FIN_PLAN_001_PHASE,
  FIN_PLAN_001_PRINCIPLE,
  FIN_PLAN_001_SCOPE,
  FIN_PLAN_001_SOURCES,
  FIN_PLAN_001_PROGRAM_SEQUENCE,
  FINANCE_CAPABILITY_PACKAGES,
  getCapabilityPackage,
  getPackageByReleaseId,
  listActiveReleasePackages,
  resolvePackageCapabilities,
  validateFinanceCapabilityPackages
} from './financeCapabilityPackages.js';
import {
  FINANCE_RELEASE_ROADMAP,
  getFinanceRelease,
  listFinanceReleases,
  getReleaseReadiness,
  validateFinanceReleaseRoadmap
} from './financeReleaseRoadmap.js';
import {
  FINANCE_BUSINESS_DECISION_MATRIX,
  getBusinessDecisionsForRelease,
  validateFinanceBusinessDecisionMatrix
} from './financeBusinessDecisionMatrix.js';
import {
  FINANCE_DEPENDENCY_MATRIX,
  getCapabilityDependencies,
  getReleaseDependencies,
  validateFinanceDependencyMatrix
} from './financeDependencyMatrix.js';

export const financePlanningApi = Object.freeze({
  phase: FIN_PLAN_001_PHASE,
  principle: FIN_PLAN_001_PRINCIPLE,
  scope: FIN_PLAN_001_SCOPE,
  sources: FIN_PLAN_001_SOURCES,
  programSequence: FIN_PLAN_001_PROGRAM_SEQUENCE,

  listPackages: () => FINANCE_CAPABILITY_PACKAGES,
  getPackage: getCapabilityPackage,
  getPackageByRelease: getPackageByReleaseId,
  listActivePackages: listActiveReleasePackages,
  resolvePackageCapabilities,

  getRoadmap: () => FINANCE_RELEASE_ROADMAP,
  listReleases: listFinanceReleases,
  getRelease: getFinanceRelease,
  getReadiness: getReleaseReadiness,

  getBusinessDecisionMatrix: () => FINANCE_BUSINESS_DECISION_MATRIX,
  getBusinessDecisions: getBusinessDecisionsForRelease,

  getDependencyMatrix: () => FINANCE_DEPENDENCY_MATRIX,
  getCapabilityDependencies,
  getReleaseDependencies,

  validate() {
    const checks = [
      validateFinanceCapabilityPackages(),
      validateFinanceReleaseRoadmap(),
      validateFinanceBusinessDecisionMatrix(),
      validateFinanceDependencyMatrix()
    ];
    const issues = checks.flatMap((c) => c.issues || []);
    return {
      valid: checks.every((c) => c.valid) && FIN_PLAN_001_SCOPE.planningOnly === true,
      issues,
      phase: FIN_PLAN_001_PHASE
    };
  }
});

export function validateFinPlan001Integrity() {
  return financePlanningApi.validate();
}

export {
  FIN_PLAN_001_PHASE,
  FIN_PLAN_001_PRINCIPLE,
  FIN_PLAN_001_SCOPE,
  FIN_PLAN_001_SOURCES,
  FIN_PLAN_001_PROGRAM_SEQUENCE,
  FINANCE_CAPABILITY_PACKAGES,
  FINANCE_RELEASE_ROADMAP,
  FINANCE_BUSINESS_DECISION_MATRIX,
  FINANCE_DEPENDENCY_MATRIX
};
