'use strict';

const health = require('../activation/safetyPublicationHealthService');
const stability = require('../activation/safetyPublicationStabilityMonitor');
const rollout = require('../activation/safetyActivationRolloutEngine');

const LEVELS = Object.freeze(['NOT_READY', 'SHADOW_READY', 'PILOT_READY', 'STAGED_READY', 'FULL_READY']);

/**
 * @param {object} pack
 * @param {object} [pack.health_checks]
 * @param {object} [pack.behavior_summary]
 * @param {object} [pack.ux_validation]
 * @param {object} [pack.cognitive_pressure]
 * @param {object} [pack.audience_validation]
 * @param {object} [pack.stability_snapshot]
 */
function classifyPilotReadiness(pack) {
  const reasons = [];
  const hc = pack.health_checks || health.runSafeActivationChecks({ tenantId: pack.tenant_id, hasSafetyIntelligenceModule: true });
  const stab = pack.stability_snapshot || stability.getStabilitySnapshot();
  const stage = hc.activation_stage || rollout.resolveActivationStage();

  if (!hc.readiness?.ready) {
    reasons.push(...(hc.readiness?.reasons || ['readiness_false']));
    return { level: 'NOT_READY', score: 20, reasons, stage };
  }

  let score = 55;
  if (stage === 'shadow' || hc.flags?.rollout_shadow) score += 10;
  if (stab.ok_ratio != null && stab.ok_ratio >= 0.8) score += 10;

  const ux = pack.ux_validation;
  if (ux?.acceptable === false) {
    reasons.push('ux_not_acceptable');
    score -= 25;
  } else if (ux?.ux_score >= 70) score += 10;

  const cog = pack.cognitive_pressure;
  if (cog?.overload_detected) {
    reasons.push('cognitive_overload');
    score -= 30;
  } else if (cog?.cognitive_risk_score != null && cog.cognitive_risk_score < 55) score += 8;

  const aud = pack.audience_validation;
  if (aud?.failure_rate > 0.2) {
    reasons.push('audience_validation_failures');
    score -= 20;
  } else if (aud?.failure_rate === 0 && (aud?.sample_count || 0) > 0) score += 10;

  const beh = pack.behavior_summary;
  if (beh?.aggregates?.denied_route_rate > 0.15) {
    reasons.push('high_denied_route_rate');
    score -= 15;
  }
  if (beh?.aggregates?.abandonment_rate > 0.4) {
    reasons.push('high_abandonment');
    score -= 15;
  }
  if ((beh?.sample_count || 0) >= 10) score += 5;

  score = Math.max(0, Math.min(100, score));

  let level = 'NOT_READY';
  if (score >= 85 && stage === 'full' && !hc.flags?.rollout_shadow) level = 'FULL_READY';
  else if (score >= 78 && ['staged', 'partial', 'full'].includes(stage)) level = 'STAGED_READY';
  else if (score >= 62 && ['pilot', 'canary', 'staged', 'partial', 'full'].includes(stage)) level = 'PILOT_READY';
  else if (score >= 45 && (stage === 'shadow' || hc.flags?.rollout_shadow)) level = 'SHADOW_READY';

  if (reasons.length && level === 'PILOT_READY' && score < 68) {
    level = 'SHADOW_READY';
  }

  return {
    level,
    score,
    reasons,
    stage,
    definitive_publication: hc.definitive_publication,
    rollback_safe: true
  };
}

module.exports = {
  LEVELS,
  classifyPilotReadiness
};
