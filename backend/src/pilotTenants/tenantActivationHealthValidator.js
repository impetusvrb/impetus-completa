'use strict';

const { validateRuntimeMenuIntegrity } = require('../menuRuntimeStabilization/runtimeMenuIntegrityValidator');
const { validateRuntimeDelivery } = require('../operationalDeliveryValidation/runtimeDeliveryValidator');
const { validateCrossDomainLeakage } = require('../operationalDeliveryValidation/crossDomainLeakageValidator');

function validateTenantActivationHealth(modules = [], ctx = {}) {
  const menu = validateRuntimeMenuIntegrity(modules);
  const delivery = validateRuntimeDelivery(modules, ctx);
  const leakage = validateCrossDomainLeakage(modules, ctx);

  return {
    healthy: menu.valid && delivery.valid && leakage.leakage_ok,
    menu,
    delivery,
    leakage
  };
}

module.exports = { validateTenantActivationHealth };
