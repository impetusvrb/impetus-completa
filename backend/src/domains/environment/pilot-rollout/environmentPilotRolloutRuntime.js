'use strict';

const orchestrator = require('../analytics/environmentOperationalValidationOrchestrator');
const readiness = require('./environmentPilotReadinessEngine');
const maturity = require('./environmentOperationalMaturityScoring');
const ergonomics = require('./environmentOperationalErgonomicsRuntime');
const saturation = require('./environmentCognitiveSaturationRuntime');
const adoption = require('./environmentOperationalAdoptionRuntime');
const multi = require('./environmentMultiDomainValidationRuntime');
const journeys = require('./environmentUserJourneyRuntime');
const enterpriseRollout = require('../../../runtime-validation/enterpriseControlledRolloutEngine');
const enterpriseAudience = require('../../../runtime-validation/enterpriseAudienceValidationRuntime');
const metrics = require('./environmentPilotMetricsRuntime');
const shadowPreflight = require('../activation/environmentShadowPreflightRuntime');

function environmentContextualNavigationValidationRuntime(ctx = {}) {
  const nav = ergonomics.environmentNavigationErgonomicsValidator(ctx);
  const journey = journeys.environmentUserJourneyRuntime(ctx.user || { role: ctx.band || 'operator' });
  return { ...nav, journey, contextual_navigation_score: nav.contextual_navigation_score };
}

function environmentPilotValidationRuntime(reqBody = {}) {
  return environmentPilotRolloutRuntime(reqBody);
}

function environmentOperationalMaturityRuntime(metricsIn = {}) {
  return maturity.scoreOperationalMaturity(metricsIn);
}

function environmentOperationalReadinessEngine(pack) {
  return readiness.classifyPilotReadiness(pack);
}

function environmentPilotReadinessRuntime(pack) {
  return readiness.classifyPilotReadiness(pack);
}

function environmentContextualMaturityRuntime(metrics = {}) {
  const mat = maturity.scoreOperationalMaturity(metrics);
  return { ...mat, contextual: mat.maturity_level === 'CONTEXTUAL' || mat.maturity_level === 'EXECUTIVE_READY' };
}

function environmentOperationalConfidenceRuntime(pack) {
  const pr = pack.pilot_readiness || {};
  return {
    confidence: Math.min(1, (pr.score || 0) / 100),
    manual_only: true,
    auto_promotion: false
  };
}

function environmentPilotRolloutRuntime(reqBody = {}) {
  const t0 = Date.now();
  const tenantId = reqBody.tenant_id || null;

  const basePack = orchestrator.runEnvironmentOperationalValidationPack({
    ...reqBody,
    tenant_id: tenantId
  });

  const audienceSamples = reqBody.audience_samples || [
    { resolved_band: 'operator', visible_menu_count: 5, module_licensed: true, should_publish_menu: true, publication_runtime_on: true },
    { resolved_band: 'technician', visible_menu_count: 6, module_licensed: true, should_publish_menu: true, publication_runtime_on: true },
    { resolved_band: 'coordinator', visible_menu_count: 8, module_licensed: true, should_publish_menu: true, publication_runtime_on: true },
    { resolved_band: 'director', visible_menu_count: 6, module_licensed: true, should_publish_menu: true, publication_runtime_on: true }
  ];

  const operationalErgonomics = ergonomics.environmentOperationalErgonomicsRuntime(reqBody.ux_profiles);
  const operationalSaturation = saturation.runEnvironmentCognitiveSaturationPack({
    menu_count: reqBody.menu_count ?? 6,
    view_count: reqBody.view_count ?? 2,
    dashboard_widget_count: reqBody.dashboard_widget_count ?? 5
  });
  const operationalMaturity = maturity.scoreOperationalMaturity(reqBody.maturity_metrics || {});
  const operationalAdoption = adoption.environmentOperationalAdoptionRuntime(tenantId, {
    module_active: reqBody.has_environment_intelligence !== false
  });
  const multiDomainCoexistence = multi.environmentMultiDomainValidationRuntime();
  const audienceValidation = enterpriseAudience.validateAudienceMatrix(audienceSamples);
  const userJourney = journeys.environmentUserJourneyRuntime(reqBody.user || { role: 'coordenador' });
  const contextualNav = environmentContextualNavigationValidationRuntime({
    ...reqBody,
    user: reqBody.user,
    operational_navigation_depth: operationalAdoption.operational_navigation_depth
  });
  const shadowCheck = shadowPreflight.runEnvironmentShadowPreflight({ tenant_id: tenantId });

  const pilotReadiness = readiness.classifyPilotReadiness({
    tenant_id: tenantId,
    health_checks: basePack.health_checks,
    stability_snapshot: basePack.stability_snapshot,
    operational_ergonomics: operationalErgonomics,
    operational_saturation: operationalSaturation.operational,
    audience_validation: audienceValidation,
    operational_maturity: operationalMaturity,
    multi_domain_coexistence: multiDomainCoexistence,
    maturity_metrics: reqBody.maturity_metrics
  });

  const controlled = enterpriseRollout.evaluateControlledRollout({
    tenant_id: tenantId,
    pilot_readiness: pilotReadiness,
    current_stage: basePack.health_checks?.activation_stage || 'shadow'
  });

  const pack = {
    ...basePack,
    ok: true,
    framework: 'environment_pilot_rollout',
    pilot_readiness: pilotReadiness,
    operational_maturity: operationalMaturity,
    operational_ergonomics: operationalErgonomics,
    operational_saturation: operationalSaturation,
    operational_adoption: operationalAdoption,
    multi_domain_coexistence: multiDomainCoexistence,
    audience_validation: audienceValidation,
    user_journey: userJourney,
    contextual_navigation: contextualNav,
    shadow_preflight: shadowCheck,
    controlled_rollout: { ...controlled, domain: 'environment', auto_promotion: false },
    rollout_governance: {
      auto_promotion: false,
      full_rollout: false,
      manual_only: true,
      escalation_protection: true,
      rollback_ready: true
    },
    operational_decision_hint: deriveDecision(pilotReadiness, operationalSaturation, operationalErgonomics),
    pilot_runtime_ms: Date.now() - t0,
    shadow_only: true
  };

  metrics.recordEnvironmentPilotMetrics(tenantId, pack);
  return pack;
}

function deriveDecision(pr, sat, erg) {
  if (pr.level === 'NOT_READY') return { action: 'REMAIN_IN_SHADOW', promote_stage: false };
  if (sat.operational?.saturation_collapse_risk || !erg.acceptable) {
    return { action: 'ADJUST_UX_AND_DENSITY', promote_stage: false };
  }
  if (pr.level === 'PILOT_READY') {
    return { action: 'PILOT_TENANT_CANDIDATE', promote_stage: false, target_stage: 'pilot', manual_only: true };
  }
  return { action: 'REMAIN_IN_SHADOW', promote_stage: false };
}

module.exports = {
  environmentPilotRolloutRuntime,
  environmentPilotValidationRuntime,
  environmentOperationalMaturityRuntime,
  environmentOperationalErgonomicsRuntime: ergonomics.environmentOperationalErgonomicsRuntime,
  environmentOperationalAdoptionRuntime: adoption.environmentOperationalAdoptionRuntime,
  environmentOperationalSaturationRuntime: saturation.runEnvironmentCognitiveSaturationPack,
  environmentOperationalBehaviorRuntime: adoption.environmentOperationalBehaviorRuntime,
  environmentAudienceBehaviorRuntime: adoption.environmentAudienceBehaviorRuntime,
  environmentContextualNavigationValidationRuntime,
  environmentOperationalMaturityScoring: maturity.scoreOperationalMaturity,
  environmentOperationalReadinessEngine,
  environmentPilotReadinessRuntime,
  environmentContextualMaturityRuntime,
  environmentOperationalConfidenceRuntime,
  environmentUserJourneyRuntime: journeys.environmentUserJourneyRuntime,
  environmentAudienceJourneyRuntime: journeys.environmentAudienceJourneyRuntime,
  environmentOperationalFlowRuntime: journeys.environmentOperationalFlowRuntime,
  environmentExecutiveFlowRuntime: journeys.environmentExecutiveFlowRuntime,
  environmentMultiDomainValidationRuntime: multi.environmentMultiDomainValidationRuntime,
  environmentPublicationCoexistenceRuntime: multi.environmentPublicationCoexistenceRuntime,
  environmentAudienceCoexistenceRuntime: multi.environmentAudienceCoexistenceRuntime,
  environmentExecutiveCoexistenceRuntime: multi.environmentExecutiveCoexistenceRuntime,
  ...saturation,
  ...ergonomics
};
