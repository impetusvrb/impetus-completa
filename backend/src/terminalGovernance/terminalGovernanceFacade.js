'use strict';

const flags = require('./config/phaseZ16FeatureFlags');
const { logPhaseZ16 } = require('./phaseZ16Logger');
const { runGovernanceTerminalStage } = require('./governanceTerminalStage');
const { resolveFinalKpiAuthority } = require('./finalKpiAuthority');
const { applySummaryDomainIsolationBeforeCompose, lockSummaryAfterTerminal } = require('./finalSummaryAuthority');
const { assessCockpitGovernanceConsistency } = require('./cockpitGovernanceConsistency');
const { resolveTerminalGovernancePolicy } = require('./terminalGovernanceResolver');
const { isTerminalGovernanceLocked } = require('./terminalGovernanceLock');

function getTerminalGovernanceStatus(ctx = {}) {
  return {
    phase: 'Z.16',
    layer: 'terminal-governance',
    terminal_governance: flags.isTerminalGovernanceEnabled(),
    sidebar_lock: flags.isTerminalSidebarLockEnabled(),
    kpi_lock: flags.isTerminalKpiLockEnabled(),
    summary_lock: flags.isTerminalSummaryLockEnabled(),
    reinjection_block: flags.isTerminalReinjectionBlockEnabled(),
    observability: flags.isTerminalGovernanceObservabilityEnabled(),
    auto_remediate: false,
    tenant_id: ctx.tenant_id
  };
}

function applyTerminalGovernanceToDashboard(user = {}, payload = {}, ctx = {}) {
  let ci = { canonical_identity: {} };
  try {
    ci = require('../operationalIdentityGovernance/operationalIdentityGovernanceFacade').resolveGovernedIdentityForUser(
      user,
      { visible_modules: payload.visible_modules, profile_code: payload.profile_code }
    );
  } catch {
    ci = { canonical_identity: { domain_axis: payload.functional_axis, hierarchy_tier: 'coordination' } };
  }

  const mergedCtx = {
    ...ctx,
    tenant_id: user?.company_id,
    canonical_identity: ci.canonical_identity,
    domain_axis: ci.canonical_identity?.domain_axis,
    hierarchy_tier: ci.canonical_identity?.hierarchy_tier,
    real_enforcement_active:
      ctx.real_enforcement_active ?? payload.real_tenant_enforcement?.real_enforcement_active
  };

  const policy = resolveTerminalGovernancePolicy(payload, mergedCtx);
  const terminal = runGovernanceTerminalStage(payload, mergedCtx);
  const cockpit = assessCockpitGovernanceConsistency(terminal.payload || payload, mergedCtx);

  if (terminal.applied && flags.isTerminalGovernanceObservabilityEnabled()) {
    logPhaseZ16('TERMINAL_GOVERNANCE_LOCKED', {
      tenant_id: user?.company_id,
      modules: terminal.payload?.visible_modules?.length
    });
  }

  return {
    payload: terminal.payload || payload,
    terminal_governance: {
      applied: terminal.applied,
      policy,
      terminal_resolution: terminal.terminal_resolution,
      governance_freeze_state: terminal.governance_freeze_state,
      cockpit_consistency: cockpit
    },
    governance_freeze_state: terminal.governance_freeze_state,
    delivery_governance_trace: terminal.applied
      ? {
          phase: 'Z.16',
          channel: 'dashboard_me',
          terminal_lock: true,
          final_visible_modules: terminal.payload?.visible_modules,
          contextual_modules_mode: 'STRICT'
        }
      : null
  };
}

function applyTerminalKpiLock(user = {}, kpis = [], ctx = {}) {
  const locked =
    flags.isTerminalKpiLockEnabled() ||
    isTerminalGovernanceLocked(ctx) ||
    ctx.governance_freeze_state?.governance_locked === true;

  if (!locked) return { kpis, terminal_kpi_lock: null };

  let ci = {};
  try {
    ci = require('../operationalIdentityGovernance/operationalIdentityGovernanceFacade').resolveGovernedIdentityForUser(user, ctx)
      .canonical_identity;
  } catch {
    ci = {};
  }

  const auth = resolveFinalKpiAuthority(kpis, {
    ...ctx,
    original_kpis: ctx.original_kpis || kpis,
    domain_axis: ci.domain_axis,
    hierarchy_tier: ci.hierarchy_tier,
    hierarchy_level: ci.hierarchy_level
  });

  return {
    kpis: auth.final_kpis,
    terminal_kpi_lock: auth,
    delivery_governance_trace: { phase: 'Z.16', channel: 'kpis', terminal_locked: true, ...auth }
  };
}

function applyTerminalSummaryLock(user = {}, summaryPayload = {}, ctx = {}) {
  const locked =
    flags.isTerminalSummaryLockEnabled() ||
    isTerminalGovernanceLocked(ctx) ||
    ctx.governance_freeze_state?.governance_locked === true;

  if (!locked) return { payload: summaryPayload, terminal_summary_lock: null };

  let ci = {};
  try {
    ci = require('../operationalIdentityGovernance/operationalIdentityGovernanceFacade').resolveGovernedIdentityForUser(user, ctx)
      .canonical_identity;
  } catch {
    ci = {};
  }

  const isolation = applySummaryDomainIsolationBeforeCompose(summaryPayload, {
    ...ctx,
    domain_axis: ci.domain_axis,
    hierarchy_tier: ci.hierarchy_tier
  });
  const lockedPayload = lockSummaryAfterTerminal(summaryPayload, isolation);

  return {
    payload: lockedPayload,
    terminal_summary_lock: isolation,
    narrative_pool_pre_compose: isolation.narrative_pool,
    delivery_governance_trace: {
      phase: 'Z.16',
      channel: 'smart_summary',
      terminal_locked: true,
      leakage_detected: isolation.leakage_detected
    }
  };
}

function getTerminalGovernanceReport(user = {}, ctx = {}) {
  return { ok: true, status: getTerminalGovernanceStatus({ tenant_id: user?.company_id }), ...ctx };
}

module.exports = {
  getTerminalGovernanceStatus,
  applyTerminalGovernanceToDashboard,
  applyTerminalKpiLock,
  applyTerminalSummaryLock,
  getTerminalGovernanceReport,
  isTerminalGovernanceLocked,
  resolveTerminalGovernancePolicy
};
