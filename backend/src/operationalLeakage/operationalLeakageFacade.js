'use strict';

const { analyzeOperationalLeakage } = require('./operationalLeakageAnalyzer');
const { detectHierarchyLeakage } = require('./hierarchyLeakageDetection');
const { detectDomainLeakage } = require('./domainLeakageDetection');
const { analyzeOperationalBlindness } = require('./operationalBlindnessAnalyzer');
const { getGovernanceLeakageTimeline, recordGovernanceLeakageEvent } = require('./governanceLeakageTimeline');

function getOperationalLeakageStatus(ctx = {}) {
  return { phase: 'Z.13', layer: 'operational-leakage', tenant_id: ctx.tenant_id, auto_remediate: false };
}

function analyzeOperationalLeakageReport(user = {}, ctx = {}) {
  const identity =
    ctx.canonical_identity ||
    require('../operationalIdentityGovernance/operationalIdentityGovernanceFacade')
      .resolveGovernedIdentityForUser(user, ctx)
      .canonical_identity;
  const modules = ctx.visible_modules || [];
  const domain = detectDomainLeakage(modules, identity);
  const hierarchy = detectHierarchyLeakage(modules, identity);
  const general = analyzeOperationalLeakage(modules, identity, ctx);
  const blindness = analyzeOperationalBlindness(ctx.delivery || { visible_modules: modules, kpis: ctx.kpis }, identity);

  if (general.leakage_detected || domain.count > 0) {
    recordGovernanceLeakageEvent(user?.company_id || ctx.tenant_id, {
      type: 'leakage_observed',
      cross_domain: general.cross_domain.length,
      domain_leaks: domain.count
    });
  }

  return {
    ok: true,
    identity,
    leakage: general,
    domain,
    hierarchy,
    blindness,
    timeline: getGovernanceLeakageTimeline(user?.company_id || ctx.tenant_id),
    observability_first: true,
    auto_remediate: false
  };
}

module.exports = {
  getOperationalLeakageStatus,
  analyzeOperationalLeakageReport,
  getGovernanceLeakageTimeline,
  recordGovernanceLeakageEvent
};
