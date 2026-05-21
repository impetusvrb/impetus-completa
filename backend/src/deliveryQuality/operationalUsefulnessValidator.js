'use strict';

function validateOperationalUsefulness(user = {}, modules = [], ctx = {}) {
  const tier = String(ctx.canonical_identity?.hierarchy_tier || '').toLowerCase();
  const useful =
    tier !== 'operational' ||
    (modules.includes('operational') || modules.includes('proaction') || modules.includes('manuia'));

  return {
    operationally_useful: useful,
    tier,
    missing_operational_toolkit: !useful && tier === 'operational'
  };
}

module.exports = { validateOperationalUsefulness };
