/**
 * Phase Z.15 — merges tardios no runtime frontend.
 */

export function auditRuntimeMerge(beforeCount, afterCount, stepName, dashboardMe = {}) {
  const grew = afterCount > beforeCount;
  const governance = dashboardMe?.sidebar_governance_runtime?.governance_applied === true;
  return {
    step: stepName,
    before_count: beforeCount,
    after_count: afterCount,
    items_added: Math.max(0, afterCount - beforeCount),
    late_merge: governance && grew,
    suspicious: governance && grew && /safety|environment|Safety|Environment/i.test(stepName)
  };
}
