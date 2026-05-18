'use strict';

const usage = require('./enterpriseOperationalUsageCollector');
const heatmap = require('./operationalNavigationHeatmap');
const flow = require('./operationalFlowStabilityEngine');
const friction = require('./operationalFrictionAnalyzer');
const density = require('./contextualDensityAdjuster');
const menuSimplifier = require('./operationalMenuSimplifier');
const panels = require('./adaptiveOperationalPanels');
const multiPub = require('./multiDomainPublicationValidator');
const cognitivePack = require('./cognitiveMaturityValidationPack');
const tenantPilot = require('./tenantPilotReadinessEngine');
const rolloutRec = require('./enterpriseRolloutRecommendationEngine');
const validation = require('../runtime-validation/enterpriseRuntimeValidationOrchestrator');

let obs;
try {
  obs = require('../services/operational/enterpriseObservabilityRuntime');
} catch {
  obs = { recordMetric: () => {} };
}

function recordShadowMetrics(tenantId, pack) {
  try {
    const t = tenantId ? String(tenantId).slice(0, 8) : 'none';
    if (pack.tenant_pilot_readiness?.operational_score != null) {
      obs.recordMetric('enterprise_shadow_operational_score', pack.tenant_pilot_readiness.operational_score, {
        tenant: t
      });
    }
    if (pack.cognitive_maturity?.rollout_readiness_score != null) {
      obs.recordMetric('enterprise_shadow_rollout_readiness', pack.cognitive_maturity.rollout_readiness_score, {
        tenant: t
      });
    }
  } catch (_e) {
    /* noop */
  }
}

function runShadowStabilizationCycle(reqBody = {}) {
  const tenantId = reqBody.tenant_id || null;
  const usageSummary = usage.summarizeUsage(tenantId);
  const samples = reqBody.samples || [];
  const heat = heatmap.buildNavigationHeatmap(samples);
  const flowStability = flow.analyzeFlowStability({ samples });
  const frictionAnalysis = friction.analyzeOperationalFriction({
    aggregates: usageSummary.behavior_summary?.aggregates
  });

  const enterprisePack = validation.runEnterpriseValidationPack({
    ...reqBody,
    tenant_id: tenantId
  });

  const multiDomain = multiPub.validateMultiDomainPublication(reqBody);
  const cognitive = cognitivePack.runCognitiveMaturityValidation({
    menu_extra_count: reqBody.menu_extra_count ?? 4,
    view_count: reqBody.view_count ?? 2,
    branching_factor: reqBody.branching_factor ?? 2,
    dashboard_widget_count: reqBody.dashboard_widget_count ?? 5,
    navigation_events_per_min: reqBody.navigation_events_per_min ?? 6
  });

  const uxStabilization = {
    density: density.recommendDensityAdjustments(enterprisePack.ux_validation),
    menu_plan_operator: menuSimplifier.simplifyMenuPlan(
      [{ id: 'quality_operational' }, { id: 'safety_operational' }, { id: 'logistics_operational' }],
      'operator'
    ),
    panels_coordinator: panels.planAdaptivePanels('coordinator', 'quality'),
    overload: require('./cognitiveOverloadReductionLayer').analyzeOverloadReduction(reqBody)
  };

  const pack = {
    ok: true,
    framework: 'enterprise_shadow_stabilization',
    phase: 'pre_environment',
    tenant_id: tenantId,
    generated_at: new Date().toISOString(),
    domains: ['quality', 'safety', 'logistics'],
    usage_summary: usageSummary,
    navigation_heatmap: heat,
    flow_stability: flowStability,
    friction: frictionAnalysis,
    multi_domain_publication: multiDomain,
    cognitive_maturity: cognitive,
    ux_stabilization: uxStabilization,
    enterprise_validation: enterprisePack,
    tenant_pilot_readiness: null,
    rollout_recommendation: null
  };

  pack.tenant_pilot_readiness = tenantPilot.evaluateTenantPilotReadiness(tenantId, pack);
  pack.rollout_recommendation = rolloutRec.buildRolloutRecommendation(pack);

  recordShadowMetrics(tenantId, pack);
  return pack;
}

module.exports = {
  runShadowStabilizationCycle,
  collectUsageEvent: usage.collectUsageEvent
};
