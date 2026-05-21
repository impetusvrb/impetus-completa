'use strict';

const flags = require('./config/phaseZ15FeatureFlags');
const { logPhaseZ15 } = require('./phaseZ15Logger');
const { traceSidebarDelivery } = require('./sidebarDeliveryTrace');
const { traceKpiDelivery } = require('./kpiDeliveryTrace');
const { traceSummaryDelivery } = require('./summaryDeliveryTrace');
const { traceInsightDelivery } = require('./insightDeliveryTrace');
const { traceCockpitDelivery } = require('./cockpitDeliveryTrace');
const { traceContextualMerge } = require('./contextualMergeTrace');
const { consolidateGovernanceAudit } = require('./deliveryGovernanceAudit');
const {
  enforceSingleSourceOfTruth,
  filterContextualModulesHardened,
  isModuleReinjectionBlocked
} = require('./deliveryGovernanceHardening');
const { buildPipelineOrderTrace } = require('./runtimePipelineOrderTrace');
const { auditLegacyInjectors } = require('./legacyInjectionTrace');

function isAuditActive(ctx = {}) {
  return (
    flags.isRuntimeDeliveryObservabilityEnabled() ||
    flags.isRuntimeDeliveryAuditEnabled() ||
    flags.isRuntimePipelineTraceEnabled() ||
    ctx.force_audit === true
  );
}

function getDeliveryAuditStatus(ctx = {}) {
  return {
    phase: 'Z.15',
    layer: 'runtime-delivery-audit',
    delivery_audit: flags.isRuntimeDeliveryAuditEnabled(),
    pipeline_trace: flags.isRuntimePipelineTraceEnabled(),
    legacy_injection_audit: flags.isLegacyInjectionAuditEnabled(),
    frontend_audit: flags.isFrontendGovernanceAuditEnabled(),
    observability: flags.isRuntimeDeliveryObservabilityEnabled(),
    auto_remediate: false,
    tenant_id: ctx.tenant_id
  };
}

function buildDeliveryGovernanceTrace(user = {}, payload = {}, ctx = {}) {
  if (!isAuditActive(ctx)) return null;

  let identity = { canonical_identity: {} };
  try {
    identity = require('../operationalIdentityGovernance/operationalIdentityGovernanceFacade').resolveGovernedIdentityForUser(
      user,
      { visible_modules: payload.visible_modules, profile_code: payload.profile_code }
    );
  } catch {
    identity = { canonical_identity: { domain_axis: payload.functional_axis, hierarchy_tier: 'coordination' } };
  }

  const ci = identity.canonical_identity || {};
  const auditCtx = {
    ...ctx,
    domain_axis: ci.domain_axis || payload.functional_axis,
    hierarchy_tier: ci.hierarchy_tier,
    hierarchy_level: ci.hierarchy_level,
    canonical_identity: ci
  };

  const sidebar = traceSidebarDelivery(
    {
      visible_modules: payload.visible_modules,
      legacy_visible_modules: ctx.legacy_visible_modules,
      contextual_modules: ctx.contextual_modules || payload.contextual_modules,
      contextual_modules_governed: payload.contextual_modules_governed,
      contextual_enforcement_activation: payload.contextual_enforcement_activation,
      pilot_runtime: payload.pilot_runtime_enforcement,
      real_tenant_enforcement: payload.real_tenant_enforcement,
      sidebar_governance_runtime: payload.sidebar_governance_runtime,
      after_contextual_activation: payload.contextual_enforcement_activation?.visible_modules_after,
      after_pilot: payload.pilot_runtime_enforcement?.menu_pipeline?.visible_modules,
      after_z13: payload.real_tenant_enforcement?.menu?.visible_modules,
      after_z14: payload.sidebar_governance_runtime?.final_visible_modules
    },
    auditCtx
  );

  const contextualMerge = traceContextualMerge(
    ctx.legacy_visible_modules || [],
    ctx.contextual_modules || [],
    payload.visible_modules || [],
    {
      governance_applied: payload.sidebar_governance_runtime?.governance_applied,
      contextual_meta: payload.contextual_modules_meta
    }
  );

  const cockpit = traceCockpitDelivery(
    {
      cockpit_blocks: {
        engine_v2: !!payload.engine_v2,
        centro_operacoes: !!(payload.engine_v2?.centro_operacoes || payload.sections),
        faturamento: (payload.kpis || []).some((k) => /faturamento/i.test(String(k.label || k.key || '')))
      }
    },
    auditCtx
  );

  const consolidated = consolidateGovernanceAudit({
    sidebar,
    denied_publications: payload.sidebar_governance_runtime?.denied_publications
  });

  const pipeline = buildPipelineOrderTrace(sidebar.stages);

  const trace = {
    phase: 'Z.15',
    channel: 'dashboard_me',
    identity: { domain: ci.domain_axis, hierarchy: ci.hierarchy_tier, authority: ci.authority_scope },
    sidebar_pipeline: sidebar,
    contextual_merge: contextualMerge,
    cockpit_pipeline: cockpit,
    pipeline_order: pipeline,
    governance_audit: consolidated,
    legacy_injectors: auditLegacyInjectors(),
    observability_only: !flags.isRuntimeDeliveryAuditEnabled(),
    auto_remediate: false
  };

  if (consolidated.leakage_points.length && flags.isRuntimeDeliveryObservabilityEnabled()) {
    logPhaseZ15('DELIVERY_LEAKAGE_AUDIT', {
      tenant_id: user?.company_id,
      points: consolidated.leakage_points.length
    });
  }

  return trace;
}

function auditDashboardMeDelivery(user = {}, payload = {}, ctx = {}) {
  const hardened = _applyDashboardHardening(payload);
  const delivery_governance_trace = buildDeliveryGovernanceTrace(user, hardened, ctx);
  const delivery_pipeline_report = delivery_governance_trace
    ? buildDeliveryPipelineReport(user, { dashboard_me: delivery_governance_trace }, ctx)
    : null;

  return {
    payload: hardened,
    delivery_governance_trace,
    delivery_pipeline_report
  };
}

function _applyDashboardHardening(payload) {
  const out = { ...payload };
  const sgr = out.sidebar_governance_runtime;
  if (!sgr || sgr.governance_applied !== true) return out;

  const sot = enforceSingleSourceOfTruth(sgr, out.visible_modules);
  if (sot.single_source_enforced) out.visible_modules = sot.modules;

  const ctxFilter = filterContextualModulesHardened(out.contextual_modules || [], sgr);
  if (ctxFilter.filtered) {
    out.contextual_modules = ctxFilter.modules;
    out.contextual_modules_governed = ctxFilter.modules;
    out._z15_contextual_blocked = ctxFilter.blocked;
  }

  return out;
}

function auditKpiDelivery(user = {}, kpis = [], ctx = {}) {
  if (!isAuditActive(ctx)) return { kpis, delivery_governance_trace: null };

  let ci = {};
  try {
    ci = require('../operationalIdentityGovernance/operationalIdentityGovernanceFacade').resolveGovernedIdentityForUser(user, ctx)
      .canonical_identity;
  } catch {
    ci = {};
  }

  const trace = traceKpiDelivery(
    {
      original_kpis: ctx.kpis_raw || kpis,
      final_kpis: kpis,
      after_cognitive_governance: ctx.after_governance,
      after_z5: ctx.after_z5,
      after_z6: ctx.after_z6
    },
    { domain_axis: ci.domain_axis, hierarchy_tier: ci.hierarchy_tier }
  );

  return {
    kpis,
    delivery_governance_trace: { phase: 'Z.15', channel: 'kpis', ...trace },
    kpi_delivery_audit: trace.kpi_delivery_audit
  };
}

function auditSummaryDelivery(user = {}, payload = {}, ctx = {}) {
  if (!isAuditActive(ctx)) return { payload, delivery_governance_trace: null };

  let ci = {};
  try {
    ci = require('../operationalIdentityGovernance/operationalIdentityGovernanceFacade').resolveGovernedIdentityForUser(user, ctx)
      .canonical_identity;
  } catch {
    ci = {};
  }

  const text = payload.summary || payload.text || '';
  const trace = traceSummaryDelivery(
    {
      summary_text: text,
      origin: 'smartSummaryService',
      z9_activation: payload.summary_runtime_activation,
      generic_fallback: text.length < 80
    },
    { domain_axis: ci.domain_axis, hierarchy_tier: ci.hierarchy_tier }
  );

  return {
    payload,
    delivery_governance_trace: { phase: 'Z.15', channel: 'smart_summary', ...trace },
    summary_delivery_audit: trace.summary_delivery_audit
  };
}

function buildDeliveryPipelineReport(user = {}, parts = {}, ctx = {}) {
  const sidebar = parts.dashboard_me?.sidebar_pipeline || parts.sidebar || {};
  const kpi = parts.kpi?.kpi_delivery_audit || parts.kpi || {};
  const summary = parts.summary?.summary_delivery_audit || parts.summary || {};
  const legacy = auditLegacyInjectors();
  const gov = parts.dashboard_me?.governance_audit || consolidateGovernanceAudit({ sidebar });

  return {
    phase: 'Z.15',
    tenant_id: user?.company_id || ctx.tenant_id,
    sidebar_pipeline: sidebar,
    kpi_pipeline: kpi,
    summary_pipeline: summary,
    legacy_injectors: legacy.legacy_injectors,
    governance_conflicts: gov.governance_conflicts,
    reinjection_points: gov.reinjection_points,
    stale_merges: gov.stale_merges,
    duplicate_sources: gov.duplicate_sources,
    leakage_points: gov.leakage_points,
    frontend_divergence: parts.frontend_divergence || [],
    final_source_of_truth:
      sidebar.governance_applied === true
        ? 'sidebar_governance_runtime.final_visible_modules'
        : 'visible_modules',
    highest_risk_components: gov.highest_risk_components,
    stabilization_recommendations: gov.stabilization_recommendations,
    pipeline_order: parts.dashboard_me?.pipeline_order || null
  };
}

function getFullDeliveryAuditReport(user = {}, ctx = {}) {
  return {
    ok: true,
    status: getDeliveryAuditStatus({ tenant_id: user?.company_id }),
    report: buildDeliveryPipelineReport(user, ctx.parts || {}, ctx),
    blockReinjection: isModuleReinjectionBlocked
  };
}

module.exports = {
  isAuditActive,
  getDeliveryAuditStatus,
  buildDeliveryGovernanceTrace,
  auditDashboardMeDelivery,
  auditKpiDelivery,
  auditSummaryDelivery,
  buildDeliveryPipelineReport,
  getFullDeliveryAuditReport,
  isModuleReinjectionBlocked,
  enforceSingleSourceOfTruth,
  filterContextualModulesHardened
};
