'use strict';

const enterprise = require('../../../runtime-validation/enterpriseRuntimeValidationOrchestrator');
const enterpriseBehavior = require('../../../runtime-validation/enterpriseOperationalBehaviorEngine');
const health = require('../activation/logisticsPublicationHealthService');
const stability = require('../activation/logisticsPublicationStabilityMonitor');
const rollout = require('../activation/logisticsActivationRolloutEngine');
const navFlags = require('../navigation/logisticsNavigationFlags');

let obs;
try {
  obs = require('../../../services/operational/enterpriseObservabilityRuntime');
} catch {
  obs = { recordMetric: () => {} };
}

function recordLogisticsMetrics(tenantId, pack) {
  try {
    const t = tenantId ? String(tenantId).slice(0, 8) : 'none';
    if (pack.cognitive_maturity?.rollout_readiness_score != null) {
      obs.recordMetric('logistics_rollout_readiness_score', pack.cognitive_maturity.rollout_readiness_score, {
        tenant: t
      });
    }
    if (pack.cognitive_maturity?.contextual_overload_score != null) {
      obs.recordMetric('logistics_cognitive_pressure', pack.cognitive_maturity.contextual_overload_score, {
        tenant: t
      });
    }
    if (pack.behavior_summary?.aggregates?.publication_resolution_ms_avg != null) {
      obs.recordMetric('logistics_publication_resolution_ms', pack.behavior_summary.aggregates.publication_resolution_ms_avg, {
        tenant: t
      });
    }
    if (pack.audience_validation?.failure_count != null) {
      obs.recordMetric('logistics_audience_validation_failures', pack.audience_validation.failure_count, {
        tenant: t
      });
    }
    const otif = pack.logistics_metrics?.otif_proxy_score;
    if (otif != null) {
      obs.recordMetric('logistics_otif_runtime_proxy', otif, { tenant: t });
    }
  } catch (_e) {
    /* never throw */
  }
}

function runLogisticsOperationalValidationPack(reqBody = {}) {
  const tenantId = reqBody.tenant_id || null;
  const enterprisePack = enterprise.runEnterpriseValidationPack({
    ...reqBody,
    tenant_id: tenantId,
    current_stage: reqBody.current_stage || rollout.resolveActivationStage()
  });

  const healthChecks = health.runSafeActivationChecks({
    tenantId,
    hasLogisticsIntelligenceModule: reqBody.has_logistics_intelligence !== false
  });

  const pack = {
    ...enterprisePack,
    ok: true,
    domain: 'logistics',
    framework: 'logistics_enterprise_runtime_alignment',
    enterprise_framework: enterprisePack.framework,
    health_checks: healthChecks,
    stability_snapshot: stability.getStabilitySnapshot(),
    navigation_flags: navFlags.snapshot(),
    logistics_metrics: {
      throughput_proxy: reqBody.throughput_proxy ?? null,
      otif_proxy_score: reqBody.otif_proxy_score ?? null,
      operational_density: enterprisePack.behavior_summary?.aggregates?.interaction_density_avg ?? null
    },
    controlled_rollout: {
      ...enterprisePack.controlled_rollout,
      domain: 'logistics',
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

  recordLogisticsMetrics(tenantId, pack);
  return pack;
}

module.exports = {
  runLogisticsOperationalValidationPack,
  recordOperationalEvent: enterpriseBehavior.recordOperationalEvent
};
