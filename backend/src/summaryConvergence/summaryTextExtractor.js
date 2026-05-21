'use strict';

function extractSummaryText(payload = {}) {
  if (typeof payload === 'string') return payload;
  return String(payload.summary || payload.text || payload.narrative || payload.content || '').trim();
}

function summaryWordCount(text = '') {
  const t = String(text || '').trim();
  if (!t) return 0;
  return t.split(/\s+/).filter(Boolean).length;
}

module.exports = { extractSummaryText, summaryWordCount };
