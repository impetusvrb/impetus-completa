'use strict';

const { runRealSummaryTargetingRuntime } = require('./realSummaryTargetingRuntime');
const { isolateNarrativeByDomain } = require('./narrativeDomainIsolation');
const { balanceExecutiveOperationalNarrative } = require('./executiveOperationalNarrativeBalancer');
const { protectSummaryLeakage } = require('./summaryLeakageProtection');
const { protectSummaryUnderdelivery } = require('./summaryUnderdeliveryProtection');

function getRealSummaryTargetingStatus(ctx = {}) {
  return { phase: 'Z.13', layer: 'real-summary-targeting', tenant_id: ctx.tenant_id, rewrite_applied: false };
}

function applyRealSummaryTargeting(user = {}, payload = {}, ctx = {}) {
  const before = { ...payload };
  const pipeline = runRealSummaryTargetingRuntime(before, user, ctx);
  let current = pipeline.payload || before;

  const leakage = protectSummaryLeakage(current, { ...ctx, enforcement_applied: pipeline.enforcement_applied });
  const balanced = balanceExecutiveOperationalNarrative(current, ctx);
  current = balanced.payload;
  const under = protectSummaryUnderdelivery(current, before, ctx);
  current = under.payload;
  const narrative = isolateNarrativeByDomain(current, ctx);

  return {
    payload: current,
    before,
    enforcement_applied: pipeline.enforcement_applied,
    shadow_only: pipeline.shadow_only,
    pipeline,
    leakage,
    narrative,
    underdelivery: under,
    fabricated: false,
    auto_remediate: false
  };
}

function getRealSummaryTargetingReport(user = {}, ctx = {}) {
  return {
    ok: true,
    status: getRealSummaryTargetingStatus({ tenant_id: user?.company_id }),
    targeting: applyRealSummaryTargeting(user, ctx.summary || {}, ctx)
  };
}

module.exports = { getRealSummaryTargetingStatus, applyRealSummaryTargeting, getRealSummaryTargetingReport };
