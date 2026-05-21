'use strict';

const SHARED_SAFE = ['operational', 'proaction', 'dashboard', 'settings', 'ai'];

function validateOperationalModules(modules = [], ctx = {}) {
  const shared = modules.filter((m) => SHARED_SAFE.includes(m));
  const axis = ctx.domain_axis;
  const domainSpecific = modules.filter((m) => !SHARED_SAFE.includes(m));
  return {
    shared_modules_ok: shared.length <= 4,
    domain_modules: domainSpecific,
    axis,
    valid: true
  };
}

module.exports = { validateOperationalModules };
