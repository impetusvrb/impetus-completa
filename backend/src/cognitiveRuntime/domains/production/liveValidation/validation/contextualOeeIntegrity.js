'use strict';

function validateContextualOeeIntegrity(signalBundle = {}) {
  const oee = signalBundle.oee_context || {};
  const op = signalBundle.operational || {};
  const issues = [];
  if (oee.weighted_oee != null && op.scrap_qty > 0 && oee.quality_proxy == null) issues.push('scrap_not_in_quality_proxy');
  if (oee.worst_line && !oee.line_contexts?.some((l) => l.line_identifier === oee.worst_line)) issues.push('worst_line_mismatch');
  return { ok: issues.length === 0, issues, downtime_correlated: (op.downtime_proxy ?? 0) > 0 };
}

module.exports = { validateContextualOeeIntegrity };
