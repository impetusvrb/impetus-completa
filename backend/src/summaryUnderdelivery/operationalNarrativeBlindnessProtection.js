'use strict';

const { extractSummaryText } = require('../summaryConvergence/summaryTextExtractor');

function protectOperationalNarrative(summaryPayload = {}, ctx = {}) {
  const text = extractSummaryText(summaryPayload).toLowerCase();
  const operational =
    text.includes('operacional') ||
    text.includes('linha') ||
    text.includes('turno') ||
    text.includes('checklist') ||
    text.includes('manutenção');
  return {
    tier: 'operational',
    operational_guidance_present: operational,
    protected: operational || text.length === 0,
    critical: text.length > 0 && !operational,
    fabricated: false
  };
}

module.exports = { protectOperationalNarrative };
