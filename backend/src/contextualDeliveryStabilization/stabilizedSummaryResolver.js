'use strict';

function resolveStabilizedSummary(summary, user, ctx = {}) {
  const axis = ctx.domain || ctx.functional_axis;
  const text = summary?.summary || summary?.text || '';
  const provenance = summary?.provenance || summary?.sources;
  const generic = summary?.generic_corporate || (!provenance && summary?.synthetic);
  const allowed = Boolean(provenance) || (!generic && String(text).length > 0);

  return {
    summary,
    allowed,
    summary_targeting_precision: allowed ? 0.9 : 0.35,
    authority_trace: 'stabilized_summary_resolver',
    contextual_confidence: provenance ? 0.92 : 0.5,
    runtime_truth_reference: ctx.runtime_truth_axis || axis,
    state: allowed ? 'ok' : 'corporate_residual_or_missing_provenance'
  };
}

module.exports = { resolveStabilizedSummary };
