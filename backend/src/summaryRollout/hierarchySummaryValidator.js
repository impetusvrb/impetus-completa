'use strict';

const { inferHierarchyBand } = require('../kpiRollout/hierarchyKpiValidator');
const { extractSummaryMeta } = require('./summaryPayloadUtils');

function validateHierarchySummary(user, summaryPayload, ctx = {}) {
  const band = inferHierarchyBand(user, ctx);
  const meta = extractSummaryMeta(summaryPayload);
  const issues = [];
  const text = meta.text.toLowerCase();

  if (band === 'operator' && /\b(diretor|ceo|conselho)\b/.test(text)) {
    issues.push({ type: 'hierarchy_mismatch', severity: 'critical', band });
  }
  if (band === 'executive' && text.length > 0 && text.length < 80) {
    issues.push({ type: 'weak_executive_summary', severity: 'medium' });
  }
  if (summaryPayload?.executive_only && !['executive', 'director'].includes(band)) {
    issues.push({ type: 'executive_summary_leakage', severity: 'critical' });
  }

  const integrity = issues.length === 0 ? 0.92 : Math.max(0.5, 0.92 - issues.length * 0.12);
  return {
    valid: issues.filter((i) => i.severity === 'critical').length === 0,
    hierarchy_coherence: Number(integrity.toFixed(4)),
    hierarchy_band: band,
    issues
  };
}

module.exports = { validateHierarchySummary };
