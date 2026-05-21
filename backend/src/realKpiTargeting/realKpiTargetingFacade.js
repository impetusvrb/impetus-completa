'use strict';

const { runRealKpiTargetingRuntime } = require('./realKpiTargetingRuntime');
const { isolateKpisByHierarchy } = require('./hierarchyKpiIsolation');
const { filterKpisByDomain } = require('./domainKpiFiltering');
const { balanceExecutiveOperationalKpis } = require('./executiveOperationalKpiBalancer');
const { protectOperationalKpiBlindness } = require('./operationalBlindnessProtection');

function getRealKpiTargetingStatus(ctx = {}) {
  return { phase: 'Z.13', layer: 'real-kpi-targeting', tenant_id: ctx.tenant_id, fabricated: false };
}

function applyRealKpiTargeting(user = {}, kpis = [], ctx = {}) {
  const before = [...kpis];
  const pipeline = runRealKpiTargetingRuntime(before, user, ctx);
  let current = pipeline.kpis || before;

  if (pipeline.enforcement_applied) {
    const domain = filterKpisByDomain(current, user, ctx);
    current = domain.kpis || current;
    const hierarchy = isolateKpisByHierarchy(current, user, ctx);
    current = hierarchy.kpis || current;
    const balanced = balanceExecutiveOperationalKpis(current, ctx);
    current = balanced.kpis;
    const blind = protectOperationalKpiBlindness(current, before, ctx);
    current = blind.kpis;
  }

  return {
    kpis: current,
    before,
    enforcement_applied: pipeline.enforcement_applied,
    shadow_only: pipeline.shadow_only,
    pipeline,
    fabricated: false,
    auto_remediate: false
  };
}

function getRealKpiTargetingReport(user = {}, ctx = {}) {
  const kpis = ctx.kpis || [];
  return { ok: true, status: getRealKpiTargetingStatus({ tenant_id: user?.company_id }), targeting: applyRealKpiTargeting(user, kpis, ctx) };
}

module.exports = { getRealKpiTargetingStatus, applyRealKpiTargeting, getRealKpiTargetingReport };
