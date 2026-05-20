'use strict';

const phaseP = require('./config/phasePFeatureFlags');
const { isolateFunctionalModule } = require('./contextualFunctionalIsolation');
const { resolveOperationalDomain } = require('./operationalDomainResolver');

function stabilizeFunctionalDomain(user, modules = [], ctx = {}) {
  const opDomain = resolveOperationalDomain(user, ctx);
  const axis = opDomain.domain;
  const results = (modules || []).map((m) => {
    const id = typeof m === 'string' ? m : m.id || m;
    return isolateFunctionalModule(id, { ...ctx, functional_axis: axis, domain: axis });
  });
  const denied = results.filter((r) => !r.allowed);
  const enforcement = phaseP.isFunctionalDomainStabilizationEnabled();

  return {
    operational_domain: opDomain,
    results,
    denied_domain: denied,
    domain_integrity: denied.length === 0 ? 0.94 : Math.max(0.45, 0.94 - denied.length * 0.1),
    enforcement_active: enforcement,
    shadow_only: !enforcement,
    stabilized_modules: enforcement ? results.filter((r) => r.allowed).map((r) => r.module_id) : modules
  };
}

module.exports = { stabilizeFunctionalDomain };
