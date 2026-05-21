'use strict';

const { validateKpiContextualAuthority } = require('../kpiEnforcementPreparation/kpiContextualAuthorityValidator');

function validateKpiAuthorityConflicts(user, kpis = [], ctx = {}) {
  const r = validateKpiContextualAuthority(user, kpis, ctx);
  const conflicts = (r.issues || []).filter((i) => i.severity === 'critical' || i.severity === 'high');
  return { valid: conflicts.length === 0, conflicts, authority_aligned: r.authority_aligned };
}

module.exports = { validateKpiAuthorityConflictValidator: validateKpiAuthorityConflicts };
