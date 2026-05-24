'use strict';

const flags = require('../config/phaseSZ1FeatureFlags');

/**
 * Governança da soberania — bloqueia mudanças que violem invariantes
 * e produz o "estado soberano" auditável.
 */
function evaluateGovernance(stageInfo = {}, shadowDiff = {}, validation = {}, compatibility = {}) {
  if (!flags.isGovernanceEnabled()) {
    return { governance_skipped: true };
  }

  const inv = flags.invariants;

  const promotion_allowed =
    inv.no_auto_promotion === true
      ? false
      : shadowDiff.safe_to_promote === true && validation.bootstrap_safe === true;

  const compatibility_layer_active = inv.motor_a_never_deleted && inv.engine_v2_never_deleted;

  const sovereignty_state = {
    stage: stageInfo.stage,
    shadow_first: inv.shadow_first,
    additive_only: inv.additive_only,
    rollback_always_available: inv.rollback_always_available,
    bounded_contexts_preserved: inv.bounded_contexts_preserved,
    monolithization: !inv.no_monolithization,
    motor_a: inv.motor_a_never_deleted ? 'preserved_as_compatibility' : 'removed',
    engine_v2: inv.engine_v2_never_deleted ? 'preserved_as_compatibility' : 'removed',
    compatibility_layer_active,
    promotion_allowed
  };

  return {
    sovereignty_state,
    invariants: inv,
    promotion_allowed,
    compatibility_layer_active,
    runtime: 'runtime_z',
    source: 'z_sovereignty_governance_runtime',
    auto_mutation: false,
    auto_remediation: false
  };
}

module.exports = { evaluateGovernance };
