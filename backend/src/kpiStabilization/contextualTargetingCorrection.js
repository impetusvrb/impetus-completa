'use strict';

const phaseU = require('./config/phaseUFeatureFlags');
const { logPhaseU } = require('./phaseULogger');
const { extractKpiList } = require('../kpiRollout/kpiTargetingValidator');
const { normalizeAxis, inferKpiDomain } = require('../kpiRollout/kpiDomainRegistry');

function correctContextualTargeting(user, kpiPayload, ctx = {}) {
  const kpis = extractKpiList(kpiPayload);
  const userAxis = normalizeAxis(ctx.functional_axis || user?.functional_axis || user?.functional_area);
  const corrections = [];
  const recommendations = [];

  for (const k of kpis) {
    const kDomain = inferKpiDomain(k);
    if (kDomain !== userAxis && kDomain !== 'general' && kDomain !== 'shared') {
      corrections.push({
        kpi_id: k.id || k.key,
        issue: 'contextual_targeting_mismatch',
        suggested_axis: userAxis,
        current_domain: kDomain,
        action: 'recommend_retarget',
        auto_apply: false
      });
      recommendations.push(`Rever targeting do KPI ${k.id || k.key} para eixo ${userAxis}`);
    }
    if (k.ambiguous || k.generic_fallback) {
      corrections.push({
        kpi_id: k.id || k.key,
        issue: 'contextual_ambiguity',
        action: 'recommend_clarify',
        auto_apply: false
      });
    }
  }

  if (corrections.length && phaseU.isKpiStabilizationObservabilityEnabled()) {
    logPhaseU('KPI_CONTEXTUAL_AMBIGUITY', { count: corrections.length, shadow_only: true });
  }

  return {
    corrections,
    recommendations,
    stabilized: corrections.length === 0,
    enforcement_active: phaseU.isKpiRuntimeStabilizationEnabled(),
    auto_correct: false
  };
}

module.exports = { correctContextualTargeting };
