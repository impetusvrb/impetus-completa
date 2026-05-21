'use strict';

const { validateCrossDomainLeakage } = require('../operationalDeliveryValidation/crossDomainLeakageValidator');
const { validateRuntimeDelivery } = require('../operationalDeliveryValidation/runtimeDeliveryValidator');

function assessContextualIntegrity(modules = [], ctx = {}) {
  const identity = ctx.canonical_identity || {};
  const delivery = validateRuntimeDelivery(modules, {
    domain_axis: identity.domain_axis,
    hierarchy_level: identity.hierarchy_level
  });
  const leakage = validateCrossDomainLeakage(modules, identity);

  const leakN = leakage.leakage_detected ? (leakage.leaks?.length || 1) : 0;
  const violationPenalty = (delivery.violations?.length || 0) * 0.08 + leakN * 0.12;
  const integrity = Math.max(0, Math.min(1, 1 - violationPenalty));

  return {
    contextual_integrity: Number(integrity.toFixed(4)),
    delivery_valid: delivery.valid,
    leakage_reduced: !leakage.leakage_detected,
    violations: delivery.violations,
    leakage: leakage.leaks || []
  };
}

module.exports = { assessContextualIntegrity };
