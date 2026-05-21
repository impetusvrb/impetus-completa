'use strict';

const { MINIMUM_MODULES } = require('../pilotTenants/pilotTenantRegistry');

const PRESERVE_ALWAYS = Object.freeze(['dashboard', 'settings', 'biblioteca', 'ai', 'chat']);

function preserveGracefulMenu(modules = [], ctx = {}) {
  const before = [...modules];
  const preserved = [...new Set([...PRESERVE_ALWAYS.filter((m) => before.includes(m) || MINIMUM_MODULES.includes(m)), ...modules])];
  const floor = [...new Set([...MINIMUM_MODULES, ...preserved])];

  return {
    before,
    after: floor,
    preserved_modules: PRESERVE_ALWAYS.filter((m) => floor.includes(m)),
    minimum_operational: MINIMUM_MODULES.every((m) => floor.includes(m))
  };
}

module.exports = { preserveGracefulMenu, PRESERVE_ALWAYS };
