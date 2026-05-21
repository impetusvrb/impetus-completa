'use strict';

const { extractSummaryText } = require('../summaryConvergence/summaryTextExtractor');

function protectExecutiveNarrative(summaryPayload = {}, ctx = {}) {
  const text = extractSummaryText(summaryPayload).toLowerCase();
  const strategic =
    text.includes('estratég') ||
    text.includes('board') ||
    text.includes('margem') ||
    text.includes('trimestre');
  return {
    tier: 'executive',
    strategic_guidance_present: strategic,
    protected: strategic || text.length === 0,
    critical: text.length > 0 && !strategic,
    fabricated: false
  };
}

module.exports = { protectExecutiveNarrative };
