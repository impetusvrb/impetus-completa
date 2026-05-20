'use strict';

const { validateSummaryDependencies } = require('./summaryDependencyValidator');

function applySummaryPrecision(summary, ctx = {}) {
  const deps = validateSummaryDependencies(summary, ctx);
  return {
    summary,
    summary_precision: {
      dependency_score: deps.dependency_score,
      valid: deps.valid,
      issues: deps.issues,
      explain_absence: !deps.valid
        ? {
            reason: deps.issues[0]?.issue || 'dependency_unavailable',
            confidence: deps.dependency_score
          }
        : null
    }
  };
}

module.exports = { applySummaryPrecision };
