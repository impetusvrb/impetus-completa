'use strict';

const flags = require('../pilotMaturity/config/phaseZ4FeatureFlags');
const { validateHierarchyTargeting } = require('./hierarchyTargetingValidator');
const { validateFunctionalTargeting } = require('./functionalTargetingValidator');
const { validateOperationalTargeting } = require('./operationalTargetingValidator');
const { detectTargetingConflicts } = require('./targetingConflictDetector');
const { validateCrossDomainLeakage } = require('../operationalDeliveryValidation/crossDomainLeakageValidator');

function assessTenantTargetingConvergence(tenantId, user = {}, ctx = {}) {
  const identity = ctx.canonical_identity || {};
  const hierarchy = validateHierarchyTargeting(identity, ctx);
  const functional = validateFunctionalTargeting(identity, ctx);
  const operational = validateOperationalTargeting(user, ctx);
  const conflicts = detectTargetingConflicts(hierarchy, functional, operational);
  const leakage = validateCrossDomainLeakage(ctx.visible_modules || [], identity);

  const converged = conflicts.stable && functional.valid && !leakage.leakage_detected;

  return {
    tenant_id: tenantId,
    converged,
    hierarchy,
    functional,
    operational,
    conflicts,
    cross_domain_leakage: leakage,
    validation_active: flags.isTargetingConvergenceValidationEnabled(),
    recommendation_only: true
  };
}

module.exports = { assessTenantTargetingConvergence };
