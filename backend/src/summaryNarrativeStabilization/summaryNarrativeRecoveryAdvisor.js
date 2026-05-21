'use strict';

function adviseNarrativeRecovery(stabilityPack = {}, ctx = {}) {
  const { oscillation, integrity, unstable } = stabilityPack;
  const actions = [];

  if (oscillation?.oscillating) {
    actions.push({ action: 'hold_snapshot', priority: 'high', fabricated: false });
  }
  if (integrity?.unstable) {
    actions.push({ action: 'restore_minimum_from_snapshot', priority: 'critical', fabricated: false });
  }
  if (!unstable) {
    actions.push({ action: 'observe', priority: 'low' });
  }

  return {
    phase: 'Z.9',
    actions,
    auto_remediate: false,
    narrative_fabricated: false,
    tenant_id: ctx.tenant_id
  };
}

module.exports = { adviseNarrativeRecovery };
