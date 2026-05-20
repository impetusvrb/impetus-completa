'use strict';

const { logPhaseK } = require('./phaseKLogger');
const { isModuleAllowedForContext } = require('./governedSharedModules');

function isolatePublication(modules, ctx = {}) {
  const input = Array.isArray(modules) ? modules : [];
  const allowed = [];
  const blocked = [];
  const leakage = [];

  for (const mod of input) {
    const check = isModuleAllowedForContext(mod, ctx);
    if (check.allowed) {
      allowed.push(mod);
    } else {
      blocked.push({ module: mod, reason: check.reason, classification: check.def?.classification });
      if (check.reason.includes('mismatch') || check.reason.includes('denied')) {
        leakage.push({ module: mod, reason: check.reason, severity: 'high' });
        logPhaseK('PUBLICATION_LEAKAGE_BLOCKED', {
          module: mod,
          axis: ctx.functional_axis,
          reason: check.reason,
          shadow_only: ctx.shadow_only !== false
        });
      }
    }
  }

  return { modules: allowed, blocked, leakage_risk: leakage };
}

module.exports = { isolatePublication };
