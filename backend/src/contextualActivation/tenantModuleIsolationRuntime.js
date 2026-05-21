'use strict';

const { applyDomainIsolation } = require('./domainIsolationRuntime');

function runTenantModuleIsolation(modules = [], ctx = {}) {
  return applyDomainIsolation(modules, ctx);
}

module.exports = { runTenantModuleIsolation };
