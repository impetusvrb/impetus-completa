'use strict';

function assessPilotHierarchyHealth(ctx = {}) {
  const targeting = ctx.targeting || {};
  return {
    hierarchy_valid: targeting.hierarchy?.valid !== false,
    functional_valid: targeting.functional?.valid !== false,
    conflicts: targeting.conflicts?.conflict_count ?? 0,
    converged: targeting.converged === true
  };
}

module.exports = { assessPilotHierarchyHealth };
