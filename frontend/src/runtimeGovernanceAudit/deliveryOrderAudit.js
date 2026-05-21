/**
 * Phase Z.15 — ordem de execução frontend.
 */

export const FRONTEND_DELIVERY_ORDER = [
  'useVisibleModules_fetch',
  'buildHybridMenu',
  'safeMergeQualityPublication',
  'safeMergeSafetyPublication',
  'safeMergeLogisticsPublication',
  'safeMergeEnvironmentPublication',
  'filterMenuByModules',
  'sidebarGovernanceAdapter',
  'dedupeSidebarMenuItems',
  'render'
];

export function auditDeliveryOrder(stepsExecuted = []) {
  const expected = FRONTEND_DELIVERY_ORDER;
  const outOfOrder = [];
  let lastIdx = -1;
  for (const step of stepsExecuted) {
    const idx = expected.indexOf(step);
    if (idx >= 0 && idx < lastIdx) outOfOrder.push({ step, expected_index: idx, last_index: lastIdx });
    if (idx > lastIdx) lastIdx = idx;
  }
  return {
    expected_order: expected,
    executed: stepsExecuted,
    stable: outOfOrder.length === 0,
    out_of_order: outOfOrder
  };
}
