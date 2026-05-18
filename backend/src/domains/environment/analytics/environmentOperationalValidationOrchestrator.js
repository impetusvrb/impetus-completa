'use strict';

const enterprise = require('../../../runtime-validation/enterpriseRuntimeValidationOrchestrator');
const enterpriseBehavior = require('../../../runtime-validation/enterpriseOperationalBehaviorEngine');
const health = require('../activation/environmentPublicationHealthService');
const stability = require('../activation/environmentPublicationStabilityMonitor');
const rollout = require('../activation/environmentActivationRolloutEngine');
const navFlags = require('../navigation/environmentNavigationFlags');
const crossDomain = require('./environmentCrossDomainCorrelationRuntime');
const cognitiveCorr = require('./environmentCognitiveCorrelationEngine');
const pilotRollout = require('../pilot-rollout/environmentPilotRolloutRuntime');

let obs;
try {
  obs = require('../../../services/operational/enterpriseObservabilityRuntime');
} catch {
  obs = { recordMetric: () => {} };
}

function recordEnvironmentMetrics(tenantId, pack) {
  try {
    const t = tenantId ? String(tenantId).slice(0, 8) : 'none';
    if (pack.cognitive_maturity?.rollout_readiness_score != null) {
      obs.recordMetric('environment_rollout_readiness_score', pack.cognitive_maturity.rollout_readiness_score, {
        tenant: t
      });
    }
    if (pack.cognitive_maturity?.contextual_overload_score != null) {
      obs.recordMetric('environment_cognitive_pressure', pack.cognitive_maturity.contextual_overload_score, {
        tenant: t
      });
    }
    if (pack.behavior_summary?.aggregates?.publication_resolution_ms_avg != null) {
      obs.recordMetric('environment_publication_resolution_ms', pack.behavior_summary.aggregates.publication_resolution_ms_avg, {
        tenant: t
      });
    }
    if (pack.audience_validation?.failure_count != null) {
      obs.recordMetric('environment_audience_validation_failures', pack.audience_validation.failure_count, {
        tenant: t
      });
    }
    const compliance = pack.environment_metrics?.compliance_proxy_score;
    if (compliance != null) {
      obs.recordMetric('environment_compliance_runtime_proxy', compliance, { tenant: t });
    }
  } catch (_e) {
    /* never throw */
  }
}

function runEnvironmentOperationalValidationPack(reqBody = {}) {
  const tenantId = reqBody.tenant_id || null;
  const enterprisePack = enterprise.runEnterpriseValidationPack({
    ...reqBody,
    tenant_id: tenantId,
    current_stage: reqBody.current_stage || rollout.resolveActivationStage()
  });

  const healthChecks = health.runSafeActivationChecks({
    tenantId,
    hasEnvironmentIntelligenceModule: reqBody.has_environment_intelligence !== false
  });

  const pack = {
    ...enterprisePack,
    ok: true,
    domain: 'environment',
    framework: 'environment_enterprise_runtime_alignment',
    enterprise_framework: enterprisePack.framework,
    health_checks: healthChecks,
    stability_snapshot: stability.getStabilitySnapshot(),
    navigation_flags: navFlags.snapshot(),
    environment_metrics: {
      compliance_proxy_score: reqBody.compliance_proxy_score ?? null,
      carbon_proxy: reqBody.carbon_proxy ?? null,
      operational_density: enterprisePack.behavior_summary?.aggregates?.interaction_density_avg ?? null
    },
    cross_domain_correlation: crossDomain.environmentalCrossDomainCorrelationRuntime(reqBody),
    cognitive_correlation: cognitiveCorr.environmentalCognitiveCorrelationEngine({
      cognitive_input: reqBody.cognitive_input,
      operational_input: reqBody
    }),
    controlled_rollout: {
      ...enterprisePack.controlled_rollout,
      domain: 'environment',
      activation_stage: healthChecks.activation_stage
    }
  };

  if (!healthChecks.readiness?.ready && pack.enterprise_decision) {
    pack.enterprise_decision = {
      action: 'REMAIN_IN_SHADOW',
      promote_stage: false,
      remain_shadow: true,
      adjust_publication: true,
      manual_only: true
    };
  }

  if (reqBody.include_pilot_rollout === true || reqBody.pilot_validation === true) {
    const pilotPack = pilotRollout.environmentPilotRolloutRuntime({
      ...reqBody,
      tenant_id: tenantId,
      include_pilot_rollout: false
    });
    pack.pilot_readiness = pilotPack.pilot_readiness;
    pack.operational_maturity = pilotPack.operational_maturity;
    pack.operational_ergonomics = pilotPack.operational_ergonomics;
    pack.operational_saturation = pilotPack.operational_saturation;
    pack.operational_adoption = pilotPack.operational_adoption;
    pack.multi_domain_coexistence = pilotPack.multi_domain_coexistence;
    pack.operational_decision_hint = pilotPack.operational_decision_hint;
  }

  recordEnvironmentMetrics(tenantId, pack);
  return pack;
}

module.exports = {
  runEnvironmentOperationalValidationPack,
  recordOperationalEvent: enterpriseBehavior.recordOperationalEvent
};
