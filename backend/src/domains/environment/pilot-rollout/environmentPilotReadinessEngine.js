'use strict';

const health = require('../activation/environmentPublicationHealthService');
const stability = require('../activation/environmentPublicationStabilityMonitor');
const rollout = require('../activation/environmentActivationRolloutEngine');
const maturity = require('./environmentOperationalMaturityScoring');

const LEVELS = Object.freeze(['NOT_READY', 'SHADOW_READY', 'PILOT_READY', 'STAGED_READY', 'FULL_READY']);

function classifyPilotReadiness(pack) {
  const reasons = [];
  const hc = pack.health_checks || health.runSafeActivationChecks({ tenantId: pack.tenant_id, hasEnvironmentIntelligenceModule: true });
  const stab = pack.stability_snapshot || stability.getStabilitySnapshot();
  const stage = hc.activation_stage || rollout.resolveActivationStage();
  const mat = pack.operational_maturity || maturity.scoreOperationalMaturity(pack.maturity_metrics || {});

  if (!hc.readiness?.ready) {
    return { level: 'NOT_READY', score: 20, reasons: hc.readiness?.reasons || ['readiness_false'], stage, maturity_level: mat.maturity_level };
  }

  let score = 50;
  if (stage === 'shadow' || hc.flags?.rollout_shadow) score += 12;
  if (stab.ok_ratio != null && stab.ok_ratio >= 0.8) score += 8;

  const erg = pack.operational_ergonomics;
  if (erg?.acceptable === false) {
    reasons.push('ergonomics_not_acceptable');
    score -= 22;
  } else if (erg?.ergonomics_score >= 70) score += 10;

  const sat = pack.operational_saturation;
  if (sat?.saturation_collapse_risk) {
    reasons.push('saturation_collapse');
    score -= 28;
  } else if (sat?.operational_saturation_score != null && sat.operational_saturation_score < 0.65) score += 8;

  const aud = pack.audience_validation;
  if (aud?.failure_rate > 0.2) {
    reasons.push('audience_failures');
    score -= 18;
  } else if (aud?.failure_rate === 0 && (aud?.sample_count || 0) > 0) score += 8;

  const coexist = pack.multi_domain_coexistence;
  if (coexist?.ok === false) {
    reasons.push('multi_domain_unstable');
    score -= 20;
  } else if (coexist?.ok) score += 10;

  if (mat.maturity_level === 'CONTEXTUAL' || mat.maturity_level === 'EXECUTIVE_READY') score += 6;

  score = Math.max(0, Math.min(100, score));

  let level = 'NOT_READY';
  if (score >= 85 && stage === 'full' && !hc.flags?.rollout_shadow) level = 'FULL_READY';
  else if (score >= 78 && ['staged', 'partial', 'full'].includes(stage)) level = 'STAGED_READY';
  else if (score >= 62 && ['pilot', 'canary', 'controlled'].includes(stage)) level = 'PILOT_READY';
  else if (score >= 42 && (stage === 'shadow' || hc.flags?.rollout_shadow)) level = 'SHADOW_READY';

  return {
    level,
    score,
    reasons,
    stage,
    maturity_level: mat.maturity_level,
    maturity_score: mat.maturity_score,
    definitive_publication: false,
    auto_promotion: false,
    rollback_safe: true,
    shadow_only: hc.flags?.rollout_shadow !== false
  };
}

module.exports = { LEVELS, classifyPilotReadiness };
