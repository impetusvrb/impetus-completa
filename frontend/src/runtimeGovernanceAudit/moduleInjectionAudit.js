/**
 * Phase Z.15 — injectors activos no cliente.
 */

export const FRONTEND_INJECTORS = [
  { name: 'buildHybridMenu', order: 75, can_reinject: true },
  { name: 'safeMergeQualityPublicationIntoMenu', order: 78, can_reinject: false },
  { name: 'safeMergeSafetyPublicationIntoMenu', order: 80, can_reinject: true },
  { name: 'safeMergeLogisticsPublicationIntoMenu', order: 82, can_reinject: true },
  { name: 'safeMergeEnvironmentPublicationIntoMenu', order: 83, can_reinject: true },
  { name: 'sidebarGovernanceAdapter', order: 90, can_reinject: false },
  { name: 'filterMenuByModules', order: 92, can_reinject: false }
];

export function auditModuleInjection(dashboardMe = {}, mergeSteps = []) {
  const denied = dashboardMe?.sidebar_governance_runtime?.denied_publications || [];
  const risky = FRONTEND_INJECTORS.filter((i) => i.can_reinject);
  return {
    injectors: FRONTEND_INJECTORS,
    reinjection_capable: risky.map((i) => i.name),
    denied_publications: denied,
    merge_steps_recorded: mergeSteps,
    governance_applied: dashboardMe?.sidebar_governance_runtime?.governance_applied === true
  };
}
