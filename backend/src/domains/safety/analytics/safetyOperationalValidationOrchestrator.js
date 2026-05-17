'use strict';

const behavior = require('./safetyOperationalBehaviorAnalytics');
const uxValidator = require('./safetyContextualUxValidator');
const cognitive = require('./safetyCognitivePressureAnalyzer');
const audience = require('./safetyAudienceValidationRuntime');
const readiness = require('./safetyPilotReadinessEngine');
const insights = require('./safetyExecutiveOperationalInsights');
const pilotGov = require('./safetyPilotGovernanceRuntime');
const health = require('../activation/safetyPublicationHealthService');
const stability = require('../activation/safetyPublicationStabilityMonitor');

let obs;
try {
  obs = require('../../../services/operational/enterpriseObservabilityRuntime');
} catch {
  obs = { recordMetric: () => {} };
}

function recordValidationMetrics(tenantId, pack) {
  try {
    const t = tenantId ? String(tenantId).slice(0, 8) : 'none';
    if (pack.pilot_readiness?.score != null) {
      obs.recordMetric('safety_rollout_readiness_score', pack.pilot_readiness.score, { tenant: t });
    }
    if (pack.cognitive_pressure?.cognitive_risk_score != null) {
      obs.recordMetric('safety_cognitive_pressure', pack.cognitive_pressure.cognitive_risk_score, { tenant: t });
    }
    if (pack.behavior_summary?.aggregates?.avg_visibility_resolution_ms != null) {
      obs.recordMetric(
        'safety_publication_resolution_ms',
        pack.behavior_summary.aggregates.avg_visibility_resolution_ms,
        { tenant: t }
      );
    }
    if (pack.audience_validation?.failure_count != null) {
      obs.recordMetric('safety_audience_validation_failures', pack.audience_validation.failure_count, {
        tenant: t
      });
    }
  } catch (_e) {
    /* observability must not throw */
  }
}

/**
 * Pacote completo de validação operacional.
 * @param {object} [reqBody]
 */
function runOperationalValidationPack(reqBody = {}) {
  const tenantId = reqBody.tenant_id || null;
  const behaviorSummary = behavior.summarizeBehavior(tenantId);

  const uxProfiles = Array.isArray(reqBody.ux_profiles)
    ? reqBody.ux_profiles
    : [
        { band: 'operator', menu_item_count: 5, navigation_depth: 2, click_density: 8, abandonment_rate: 0.1 },
        { band: 'sst_technician', menu_item_count: 8, navigation_depth: 3, click_density: 14, abandonment_rate: 0.12 },
        { band: 'coordinator', menu_item_count: 10, navigation_depth: 4, click_density: 16, abandonment_rate: 0.15 },
        { band: 'director', menu_item_count: 6, navigation_depth: 3, click_density: 10, abandonment_rate: 0.08 }
      ];
  const uxMulti = uxValidator.validateMultiProfile(uxProfiles);
  const primaryUx = uxMulti.results?.[0] || uxValidator.validateContextualUx({ band: 'operator' });

  const cognitivePressure = cognitive.analyzeCognitivePressure({
    menu_extra_count: reqBody.menu_extra_count ?? (behaviorSummary.aggregates?.top_routes?.length || 0),
    view_count: reqBody.view_count ?? 2,
    navigation_events_per_min: reqBody.navigation_events_per_min ?? 8,
    dashboard_widget_count: reqBody.dashboard_widget_count ?? 6,
    branching_factor: reqBody.branching_factor ?? 2,
    cognitive_budget_remaining: reqBody.cognitive_budget_remaining ?? 65
  });

  const audienceSamples = Array.isArray(reqBody.audience_samples) ? reqBody.audience_samples : [];
  const audienceValidation = audience.validateAudienceMatrix(audienceSamples);

  const healthChecks = health.runSafeActivationChecks({
    tenantId,
    hasSafetyIntelligenceModule: reqBody.has_safety_intelligence !== false
  });

  const pilotReadiness = readiness.classifyPilotReadiness({
    tenant_id: tenantId,
    health_checks: healthChecks,
    behavior_summary: behaviorSummary,
    ux_validation: primaryUx,
    cognitive_pressure: cognitivePressure,
    audience_validation: audienceValidation,
    stability_snapshot: stability.getStabilitySnapshot()
  });

  const executive = insights.buildExecutiveNarrative({
    pilot_readiness: pilotReadiness,
    behavior_summary: behaviorSummary,
    ux_validation: primaryUx,
    cognitive_pressure: cognitivePressure
  });

  const pack = {
    ok: true,
    domain: 'safety',
    tenant_id: tenantId,
    generated_at: new Date().toISOString(),
    behavior_summary: behaviorSummary,
    ux_validation: uxMulti,
    cognitive_pressure: cognitivePressure,
    audience_validation: audienceValidation,
    health_checks: healthChecks,
    stability_snapshot: stability.getStabilitySnapshot(),
    pilot_readiness: pilotReadiness,
    executive_insights: executive,
    pilot_scopes: pilotGov.listPilotScopes(tenantId),
    operational_decision_hint: deriveOperationalDecision(pilotReadiness, cognitivePressure, primaryUx)
  };

  recordValidationMetrics(tenantId, pack);
  return pack;
}

function deriveOperationalDecision(pilotReadiness, cognitivePressure, ux) {
  if (pilotReadiness.level === 'NOT_READY') {
    return { action: 'BLOCK_ROLLOUT', promote_stage: false, adjust_ux: true };
  }
  if (cognitivePressure.overload_detected || ux.acceptable === false) {
    return { action: 'ADJUST_UX_AND_PUBLICATION', promote_stage: false, adjust_ux: true };
  }
  if (pilotReadiness.level === 'PILOT_READY') {
    return { action: 'ADVANCE_TO_PILOT', promote_stage: true, target_stage: 'pilot', adjust_ux: false };
  }
  if (pilotReadiness.level === 'SHADOW_READY') {
    return { action: 'REMAIN_IN_SHADOW', promote_stage: false, adjust_ux: false };
  }
  return { action: 'REMAIN_IN_SHADOW', promote_stage: false };
}

module.exports = {
  runOperationalValidationPack,
  recordBehaviorEvent: behavior.recordBehaviorEvent
};
