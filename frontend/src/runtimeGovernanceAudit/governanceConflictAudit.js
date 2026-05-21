/**
 * Phase Z.15 — conflitos backend vs frontend.
 */

export function auditGovernanceConflict(dashboardMe = {}, menuItems = []) {
  const runtime = dashboardMe?.sidebar_governance_runtime || {};
  const backendFinal = new Set((runtime.final_visible_modules || []).map((m) => String(m).toLowerCase()));
  const conflicts = [];

  if (runtime.governance_applied && backendFinal.size === 0) {
    conflicts.push({ type: 'empty_final_visible_modules' });
  }

  const safetyItems = (menuItems || []).filter((i) => i._safety_publication);
  if (runtime.governance_applied && safetyItems.length && !backendFinal.has('safety_intelligence')) {
    conflicts.push({
      type: 'frontend_safety_publication_conflict',
      count: safetyItems.length
    });
  }

  return {
    conflicts,
    conflict_count: conflicts.length,
    single_source: runtime.governance_applied ? 'final_visible_modules' : 'visible_modules'
  };
}
