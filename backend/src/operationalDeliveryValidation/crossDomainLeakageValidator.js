'use strict';

function validateCrossDomainLeakage(modules = [], ctx = {}) {
  const leaks = require('../runtimeObservation/runtimeDeliveryLeakageObserver').observeDeliveryLeakage({
    visible_modules: modules,
    canonical_identity: { domain_axis: ctx.domain_axis },
    functional_axis: ctx.domain_axis
  });
  return { leakage_ok: !leaks.leakage_detected, ...leaks };
}

module.exports = { validateCrossDomainLeakage };
