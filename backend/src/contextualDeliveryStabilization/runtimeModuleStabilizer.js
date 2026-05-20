'use strict';

const { isolateModule } = require('./contextualModuleIsolation');

function stabilizeModules(modules, user, ctx = {}) {
  const list = Array.isArray(modules) ? modules : [];
  const scored = list.map((m) => {
    const id = typeof m === 'string' ? m : m.id || m;
    return isolateModule(id, user, ctx);
  });
  const eligible = scored.filter((s) => s.allowed);
  const precision = list.length ? eligible.length / list.length : 1;
  return {
    scored,
    eligible_modules: eligible.map((e) => e.module_id),
    module_targeting_precision: Number(precision.toFixed(4)),
    module_delivery_integrity: Number((precision * 0.95).toFixed(4))
  };
}

module.exports = { stabilizeModules };
