'use strict';

const flags = require('./config/phaseZ1FeatureFlags');
const { logPhaseZ1 } = require('./phaseZ1Logger');
const { isModuleAllowedForContext } = require('./moduleDeliveryClassification');

function validateContextualMenuTargeting(matrix = {}, ctx = {}) {
  const delivered = ctx.visible_modules || matrix.permitted_modules_simulation || [];
  const axis = matrix.domain_axis;
  const level = matrix.hierarchy_level;
  let violations = 0;
  const details = [];

  for (const mod of delivered) {
    const check = isModuleAllowedForContext(mod, {
      domain_axis: axis,
      hierarchy_level: level,
      tenant_pilot_enabled: ctx.tenant_pilot_enabled
    });
    if (!check.allowed) {
      violations++;
      details.push({ module: mod, ...check });
    }
  }

  const targeting_integrity = Number(Math.max(0, 1 - violations / Math.max(1, delivered.length)).toFixed(4));

  if (violations > 0 && flags.isContextualEnforcementObservabilityEnabled()) {
    logPhaseZ1('MENU_TARGETING_VIOLATION', { violations, axis, shadow_only: true });
  }

  return {
    targeting_integrity,
    violations,
    violation_details: details,
    leakage_probability: Number((violations / Math.max(1, delivered.length)).toFixed(4)),
    auto_hide: false
  };
}

module.exports = { validateContextualMenuTargeting };
