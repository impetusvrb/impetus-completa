'use strict';

const runtimeEngine = require('./enterpriseRuntimeValidationEngine');
const behavior = require('./enterpriseOperationalBehaviorEngine');
const uxValidator = require('./enterpriseContextualUxValidator');
const audience = require('./enterpriseAudienceValidationRuntime');
const cognitive = require('./enterpriseCognitiveMaturityEngine');
const rollout = require('./enterpriseControlledRolloutEngine');
const insights = require('./enterpriseOperationalInsightsEngine');
const decision = require('./enterpriseDecisionEngine');

let obs;
try {
  obs = require('../services/operational/enterpriseObservabilityRuntime');
} catch {
  obs = { recordMetric: () => {} };
}

function recordEnterpriseMetrics(tenantId, pack) {
  try {
    const t = tenantId ? String(tenantId).slice(0, 8) : 'none';
    if (pack.runtime_validation?.runtime_validation_ms != null) {
      obs.recordMetric('runtime_validation_ms', pack.runtime_validation.runtime_validation_ms, { tenant: t });
    }
    const pubMs = pack.behavior_summary?.aggregates?.publication_resolution_ms_avg;
    if (pubMs != null) {
      obs.recordMetric('publication_resolution_ms', pubMs, { tenant: t });
    }
    const navMs = pack.behavior_summary?.aggregates?.audience_resolution_ms_avg;
    if (navMs != null) {
      obs.recordMetric('navigation_runtime_ms', navMs, { tenant: t });
    }
    if (pack.audience_validation?.failure_count != null) {
      obs.recordMetric('audience_validation_failures', pack.audience_validation.failure_count, { tenant: t });
    }
    if (pack.cognitive_maturity?.rollout_readiness_score != null) {
      obs.recordMetric('rollout_readiness_score', pack.cognitive_maturity.rollout_readiness_score, { tenant: t });
    }
    if (pack.cognitive_maturity?.contextual_overload_score != null) {
      obs.recordMetric('contextual_overload_score', pack.cognitive_maturity.contextual_overload_score, { tenant: t });
      obs.recordMetric('cognitive_pressure_score', pack.cognitive_maturity.contextual_overload_score, { tenant: t });
    }
    if (pack.behavior_summary?.aggregates?.interaction_density_avg != null) {
      obs.recordMetric('operational_density_score', pack.behavior_summary.aggregates.interaction_density_avg, {
        tenant: t
      });
    }
  } catch (_e) {
    /* observability must not throw */
  }
}

function runEnterpriseValidationPack(reqBody = {}) {
  const tenantId = reqBody.tenant_id || null;
  const runtime_validation = runtimeEngine.validateEnterpriseRuntime({
    require_quality_runtime: reqBody.require_quality_runtime === true
  });
  const behavior_summary = behavior.summarizeOperationalBehavior(tenantId);

  const uxProfiles = Array.isArray(reqBody.ux_profiles)
    ? reqBody.ux_profiles
    : [
        { band: 'operator', menu_item_count: 5, navigation_depth: 2, click_density: 8, abandonment_rate: 0.08 },
        { band: 'technician', menu_item_count: 9, navigation_depth: 3, click_density: 14, abandonment_rate: 0.1 },
        { band: 'supervisor', menu_item_count: 10, navigation_depth: 3, click_density: 16, abandonment_rate: 0.12 },
        { band: 'coordinator', menu_item_count: 11, navigation_depth: 4, click_density: 18, abandonment_rate: 0.14 },
        { band: 'director', menu_item_count: 6, navigation_depth: 3, click_density: 10, dashboard_count: 5, abandonment_rate: 0.07 }
      ];
  const ux_validation = uxValidator.validateMultiProfile(uxProfiles);

  const cognitive_maturity = cognitive.analyzeCognitiveMaturity({
    menu_extra_count: reqBody.menu_extra_count ?? 4,
    view_count: reqBody.view_count ?? 2,
    branching_factor: reqBody.branching_factor ?? 2,
    dashboard_widget_count: reqBody.dashboard_widget_count ?? 5,
    navigation_events_per_min: reqBody.navigation_events_per_min ?? 6,
    cognitive_budget_remaining: reqBody.cognitive_budget_remaining
  });

  const audienceSamples = Array.isArray(reqBody.audience_samples) ? reqBody.audience_samples : [];
  const audience_validation = audience.validateAudienceMatrix(audienceSamples);

  let activationStage = 'shadow';
  try {
    const safetyRollout = require('../domains/safety/activation/safetyActivationRolloutEngine');
    activationStage = safetyRollout.resolveActivationStage();
  } catch {
    /* optional */
  }

  const controlled_rollout = rollout.evaluateControlledRollout({
    current_stage: reqBody.current_stage || activationStage,
    runtime_validation,
    ux_validation,
    audience_validation,
    cognitive_maturity,
    behavior_summary
  });

  const pack = {
    ok: true,
    framework: 'enterprise_runtime_validation',
    tenant_id: tenantId,
    generated_at: new Date().toISOString(),
    runtime_validation,
    behavior_summary,
    ux_validation,
    cognitive_maturity,
    audience_validation,
    controlled_rollout,
    enterprise_decision: null,
    executive_insights: null
  };

  pack.executive_insights = insights.buildOperationalInsights(pack);
  pack.enterprise_decision = decision.deriveEnterpriseDecision(pack);

  recordEnterpriseMetrics(tenantId, pack);
  return pack;
}

module.exports = {
  runEnterpriseValidationPack,
  recordOperationalEvent: behavior.recordOperationalEvent
};
