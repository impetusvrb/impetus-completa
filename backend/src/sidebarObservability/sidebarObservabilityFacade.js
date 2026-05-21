'use strict';

const flags = require('../canonicalModuleGovernance/config/phaseZ14FeatureFlags');
const { getSidebarLeakageTimeline, recordSidebarLeakageEvent } = require('./sidebarLeakageTimeline');
const { assessSidebarGovernanceHealth } = require('./sidebarGovernanceHealth');
const { analyzeSidebarModuleDistribution } = require('./sidebarModuleDistribution');
const { getRecentSidebarPruningAudits, recordSidebarPruningAudit } = require('./sidebarPruningAudit');

function getSidebarObservabilityStatus(ctx = {}) {
  return {
    phase: 'Z.14',
    layer: 'sidebar-observability',
    observability: flags.isSidebarObservabilityEnabled(),
    tenant_id: ctx.tenant_id
  };
}

function buildSidebarObservabilityReport(user = {}, ctx = {}) {
  const tenantId = user?.company_id || ctx.tenant_id;
  const modules = ctx.visible_modules || [];
  const resolution = ctx.governance_resolution || {};

  const distribution = analyzeSidebarModuleDistribution(modules, {
    domain_axis: resolution.domain || ctx.domain_axis
  });
  const health = assessSidebarGovernanceHealth(resolution);

  if (resolution.leakage_detected && flags.isSidebarObservabilityEnabled()) {
    recordSidebarLeakageEvent(tenantId, {
      type: 'sidebar_leakage',
      domain: resolution.domain,
      count: resolution.leakage_after?.leakage_count
    });
  }

  if (resolution.governance_applied) {
    recordSidebarPruningAudit({
      tenant_id: tenantId,
      removed: resolution.removed_modules?.length,
      score: resolution.governance_score,
      domain: resolution.domain
    });
  }

  return {
    ok: true,
    status: getSidebarObservabilityStatus({ tenant_id: tenantId }),
    distribution,
    health,
    timeline: getSidebarLeakageTimeline(tenantId),
    recent_audits: getRecentSidebarPruningAudits(20, tenantId),
    auto_remediate: false
  };
}

module.exports = {
  getSidebarObservabilityStatus,
  buildSidebarObservabilityReport,
  getSidebarLeakageTimeline,
  recordSidebarLeakageEvent
};
