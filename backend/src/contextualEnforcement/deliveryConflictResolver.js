'use strict';

function resolveDeliveryConflicts(matrix = {}, targeting = {}, hierarchy = {}) {
  const conflicts = [];

  for (const w of matrix.would_block_simulation || []) {
    conflicts.push({ type: 'canonical_block', module: w.module, reason: w.reason });
  }
  for (const v of targeting.violation_details || []) {
    conflicts.push({ type: 'targeting_violation', module: v.module, reason: v.reason });
  }
  if (hierarchy.hierarchy_conflicts > 0) {
    conflicts.push({ type: 'hierarchy_mismatch', count: hierarchy.hierarchy_conflicts });
  }

  const resolved_plan = conflicts.map((c, i) => ({
    step: i + 1,
    action: 'manual_review',
    conflict: c,
    auto_resolve: false
  }));

  return {
    conflict_count: conflicts.length,
    conflicts,
    resolved_plan,
    auto_execute: false,
    recommendation_only: true
  };
}

module.exports = { resolveDeliveryConflicts };
