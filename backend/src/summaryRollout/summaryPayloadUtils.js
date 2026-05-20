'use strict';

const { normalizeAxis } = require('../kpiRollout/kpiDomainRegistry');

function extractSummaryText(payload) {
  if (typeof payload === 'string') return payload;
  return String(payload?.summary || payload?.text || payload?.content || payload?.narrative || '');
}

function extractSummaryMeta(payload) {
  return {
    text: extractSummaryText(payload),
    axis: normalizeAxis(payload?.functional_axis || payload?.axis),
    provenance: payload?.provenance || payload?.sources || null,
    stale: payload?.stale === true || payload?.is_stale === true
  };
}

module.exports = { extractSummaryText, extractSummaryMeta, normalizeAxis };
