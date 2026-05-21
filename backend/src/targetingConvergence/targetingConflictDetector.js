'use strict';

function detectTargetingConflicts(hierarchy = {}, functional = {}, operational = {}) {
  const conflicts = [];
  if (!functional.valid) conflicts.push({ type: 'functional_incomplete', severity: 'high' });
  if (!hierarchy.valid) conflicts.push({ type: 'hierarchy_incomplete', severity: 'medium' });
  for (const i of hierarchy.issues || []) {
    if (i.severity === 'medium') conflicts.push({ type: 'hierarchy_conflict', detail: i });
  }
  return {
    conflict_count: conflicts.length,
    conflicts,
    stable: conflicts.filter((c) => c.severity === 'high').length === 0
  };
}

module.exports = { detectTargetingConflicts };
