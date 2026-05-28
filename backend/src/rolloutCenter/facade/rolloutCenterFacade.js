'use strict';

/**
 * PROMPT 29 — Rollout Center facade (painel unificado).
 */

const flags = require('../config/rolloutCenterFlags');
const catalog = require('../catalog/capabilityCatalog');
const gates = require('../governance/promotionGateRegistry');
const effectiveFlags = require('../resolvers/effectiveFlagsResolver');
const governanceAgg = require('../resolvers/governanceStateAggregator');
const audit = require('../observability/rolloutCenterAuditService');

function _log(event, data) {
  try {
    console.info(
      '[ROLLOUT_CENTER]',
      JSON.stringify({ event, ts: new Date().toISOString(), center_mode: flags.rolloutCenterMode(), ...data })
    );
  } catch (_e) {}
}

function getHealth() {
  return {
    mode: flags.rolloutCenterMode(),
    active: flags.isRolloutCenterActive(),
    capabilities: catalog.listCapabilities().length,
    allows_promotion_simulation: flags.allowsPromotionSimulation(),
    invariants: {
      additive_only: true,
      shadow_first: true,
      no_env_mutation_at_runtime: true,
      motor_a_intact: true,
      engine_v2_intact: true
    }
  };
}

function buildDashboard(companyId = null) {
  const capabilities = effectiveFlags.resolveCapabilityFlags();
  const gatesEval = gates.evaluateAllGates();
  const governance_states = governanceAgg.aggregateGovernanceStates(companyId);
  const global_flags = effectiveFlags.resolveGlobalEffectiveFlags(120);

  let flagDiagnostics = null;
  try {
    const fr = require('../../governance/flagReconcilerRuntime');
    flagDiagnostics = {
      boot: fr.getBootDiagnostics(),
      conflicts_count: (fr.getConflictMatrix().conflicts || []).length
    };
  } catch (_e) {
    flagDiagnostics = { error: 'reconciler_unavailable' };
  }

  const summary = {
    total: capabilities.length,
    on: capabilities.filter((c) => c.effective_mode === 'on').length,
    shadow: capabilities.filter((c) => c.effective_mode === 'shadow').length,
    audit: capabilities.filter((c) => c.effective_mode === 'audit').length,
    off: capabilities.filter((c) => c.effective_mode === 'off').length,
    gates_passing: gatesEval.filter((g) => g.gate_passed).length,
    gates_total: gatesEval.length
  };

  return {
    ok: true,
    center_mode: flags.rolloutCenterMode(),
    summary,
    capabilities,
    promotion_gates: gatesEval,
    governance_states,
    global_flags,
    flag_diagnostics: flagDiagnostics,
    generated_at: new Date().toISOString()
  };
}

async function evaluatePromotion(capabilityId, targetMode, ctx = {}) {
  const gate = gates.evaluateGate(capabilityId, targetMode);
  _log('promotion_gate', {
    capability_id: capabilityId,
    gate_passed: gate.gate_passed,
    current: gate.current_mode,
    requested: gate.requested_mode
  });

  if (flags.shouldPersistAudit()) {
    await audit
      .recordAudit({
        companyId: ctx.companyId,
        capabilityId,
        action: 'promotion_gate_eval',
        fromMode: gate.current_mode,
        toMode: gate.requested_mode,
        gatePassed: gate.gate_passed,
        actorUserId: ctx.actorUserId,
        explainability: { checks: gate.checks },
        payload: gate
      })
      .catch(() => {});
  }

  return gate;
}

module.exports = {
  getHealth,
  buildDashboard,
  evaluatePromotion
};
