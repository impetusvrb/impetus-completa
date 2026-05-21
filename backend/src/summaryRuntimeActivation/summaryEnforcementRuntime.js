'use strict';

const flags = require('./config/phaseZ9FeatureFlags');
const { isPilotTenant, getPilotTenant } = require('../pilotTenants/pilotTenantRegistry');
const { getTenantEnforcementState } = require('../contextualActivation/tenantEnforcementState');
const { extractSummaryText } = require('../summaryConvergence/summaryTextExtractor');
const { assessSummaryRollbackReadiness } = require('./summaryRuntimeRollbackReadiness');
const { logPhaseZ9 } = require('./phaseZ9Logger');

function shouldEnforceSummary(tenantId, ctx = {}) {
  if (!isPilotTenant(tenantId) && !ctx.force_summary_enforcement) return false;
  if (
    (!flags.isSummaryRuntimeActivationEnabled() || !flags.isTenantSummaryEnforcementEnabled()) &&
    !ctx.force_summary_enforcement
  ) {
    return false;
  }
  const state = getTenantEnforcementState(tenantId);
  if (!state.channels.summary && !ctx.force_summary_enforcement) return false;
  const rollback = assessSummaryRollbackReadiness(tenantId, ctx);
  return rollback.ready || ctx.force_summary_enforcement === true;
}

function applySnapshotRestore(payload = {}, tenantId, ctx = {}) {
  const pilot = getPilotTenant(tenantId);
  const snap = ctx.summary_snapshot || pilot?.summary_snapshot;
  if (!snap || typeof snap !== 'object') return { payload, restored: false };

  const restored = { ...payload };
  const text = extractSummaryText(snap);
  if (!text) return { payload, restored: false };

  restored.summary = snap.summary || text;
  restored.text = snap.text || restored.summary;
  return {
    payload: restored,
    restored: true,
    source: 'summary_snapshot',
    narrative_fabricated: false
  };
}

function applyTargetingHardening(payload = {}, ctx = {}) {
  if (!flags.isSummaryTargetingHardeningEnabled()) {
    return { payload, hardened: false };
  }
  const { hardenCrossDomainNarrative } = require('../summaryTargetingHardening/narrativeCrossDomainHardening');
  const result = hardenCrossDomainNarrative(payload, ctx);
  if (!result.enforcement_candidate) return { payload, hardened: false };

  const out = { ...payload };
  out.summary = result.text;
  out.text = result.text;
  return {
    payload: out,
    hardened: true,
    removed_sentences: result.removed?.length || 0,
    narrative_fabricated: false
  };
}

function runSummaryEnforcementPipeline(summaryPayload = {}, user = {}, ctx = {}) {
  const tenantId = user?.company_id || ctx.tenant_id;
  const before = { ...summaryPayload };
  let current = { ...summaryPayload };
  const steps = [];

  const underdelivery = require('../summaryUnderdelivery/summaryUnderdeliveryFacade').assessSummaryUnderdelivery(
    current,
    ctx
  );
  steps.push({ step: 'underdelivery', critical: underdelivery.critical_underdelivery });

  let textChanged = false;

  if (underdelivery.critical_underdelivery) {
    const snap = applySnapshotRestore(current, tenantId, ctx);
    if (snap.restored) {
      current = snap.payload;
      textChanged = true;
      steps.push({ step: 'snapshot_restore', restored: true });
    }
  }

  if (flags.isSummaryTargetingHardeningEnabled()) {
    const hard = applyTargetingHardening(current, ctx);
    if (hard.hardened) {
      current = hard.payload;
      textChanged = true;
      steps.push({ step: 'targeting_hardening', removed: hard.removed_sentences });
    }
  }

  if (textChanged) {
    logPhaseZ9('SUMMARY_ENFORCEMENT_APPLIED', { tenant_id: tenantId, steps: steps.map((s) => s.step) });
  }

  return {
    payload: current,
    before,
    enforcement_applied: textChanged,
    steps,
    narrative_fabricated: false,
    narrative_rewritten: false,
    text_preserved: !textChanged
  };
}

module.exports = {
  shouldEnforceSummary,
  runSummaryEnforcementPipeline,
  applySnapshotRestore,
  applyTargetingHardening
};
