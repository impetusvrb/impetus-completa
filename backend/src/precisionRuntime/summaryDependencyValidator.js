'use strict';

function validateSummaryDependencies(summary, ctx = {}) {
  const issues = [];
  if (!summary) {
    return { valid: false, issues: [{ issue: 'summary_absent' }], dependency_score: 0 };
  }
  if (summary.synthetic && !summary.provenance) {
    issues.push({ issue: 'missing_provenance', severity: 'high' });
  }
  if (summary.generic_corporate && !ctx.allow_corporate) {
    issues.push({ issue: 'corporate_residual', severity: 'medium' });
  }
  if (!summary.sources?.length && !summary.legacy_builder) {
    issues.push({ issue: 'missing_sources', severity: 'high' });
  }
  return {
    valid: issues.filter((i) => i.severity === 'high' || i.severity === 'critical').length === 0,
    issues,
    dependency_score: issues.length === 0 ? 1 : Math.max(0.2, 1 - issues.length * 0.2)
  };
}

module.exports = { validateSummaryDependencies };
