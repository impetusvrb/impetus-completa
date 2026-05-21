'use strict';

function traceSummaryDelivery(input = {}, ctx = {}) {
  const trace = [];
  let order = 0;
  const push = (stage, source, meta = {}) => {
    order += 1;
    trace.push({ stage, source, execution_order: order, timestamp: new Date().toISOString(), ...meta });
  };

  push('smart_summary_build', 'smartSummaryService', { origin: 'service' });
  if (input.cognitive_governance) push('cognitive_governance', 'cognitiveGovernanceFacade', { denied: input.cognitive_governance.denied });
  if (input.semantic_alignment) push('semantic_alignment', 'governedSummaryAlignment');
  if (input.precision) push('precision_runtime', 'precisionRuntimeFacade');
  if (input.summary_rollout) push('summary_rollout', 'summaryRolloutFacade');
  if (input.z8_convergence) push('summary_convergence_Z8', 'summaryConvergenceFacade');
  if (input.z9_activation) push('summary_runtime_Z9', 'summaryRuntimeActivation', {
    enforcement_applied: input.z9_activation?.enforcement_applied
  });

  const text = String(input.summary_text || input.summary || '');
  const crossDomain = [];
  if ((ctx.domain_axis === 'quality' || ctx.domain_axis === 'hr') && /sst|apr\b|loto\b|seguran[cç]a do trabalho/i.test(text)) {
    crossDomain.push('sst_narrative_on_non_safety_domain');
  }
  if (ctx.domain_axis === 'quality' && /faturamento|lucro líquido|oee global/i.test(text) && !/qualidade|ncr|inspe/i.test(text)) {
    crossDomain.push('executive_narrative_on_quality');
  }

  return {
    summary_delivery_audit: {
      origin: input.origin || 'smartSummaryService',
      domain_axis: ctx.domain_axis,
      hierarchy_tier: ctx.hierarchy_tier,
      cross_domain_hints: crossDomain,
      leakage_detected: crossDomain.length > 0,
      generic_fallback: input.generic_fallback === true,
      operational_blindness: !text || text.length < 40,
      legacy_narrative_injection: input.legacy_injection === true,
      duplicated: input.duplicated === true
    },
    trace
  };
}

module.exports = { traceSummaryDelivery };
