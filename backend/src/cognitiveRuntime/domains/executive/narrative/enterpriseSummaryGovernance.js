'use strict';

function validateEnterpriseSummaryGovernance(summary = {}) {
  return {
    strategic_focus: Array.isArray(summary.focus) && summary.focus.includes('risco'),
    generic_filler: summary.generic_filler === true
  };
}

module.exports = { validateEnterpriseSummaryGovernance };
