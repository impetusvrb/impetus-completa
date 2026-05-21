'use strict';

const { extractSummaryText } = require('./summaryTextExtractor');

function alignSummaryWithKpis(summaryPayload = {}, kpis = [], ctx = {}) {
  const text = extractSummaryText(summaryPayload).toLowerCase();
  const list = Array.isArray(kpis) ? kpis : [];
  let mentions = 0;

  for (const k of list) {
    const key = String(k.key || k.id || k.name || '').toLowerCase();
    const label = String(k.title || k.label || '').toLowerCase();
    if (!key && !label) continue;
    const spaced = key.replace(/_/g, ' ');
    const parts = key.split('_').filter((p) => p.length > 2);
    if (
      (key && text.includes(key)) ||
      (key && text.includes(spaced)) ||
      (label && text.includes(label)) ||
      (parts.length > 0 && parts.every((p) => text.includes(p)))
    ) {
      mentions++;
    }
  }

  const alignment_score =
    list.length === 0 ? (text.length > 20 ? 0.5 : 0) : Number((mentions / Math.max(list.length, 1)).toFixed(4));

  const contradictions = [];
  if (ctx.kpi_governance_health?.blindness?.critical_blind_spot && text.length > 100) {
    contradictions.push({ type: 'narrative_kpi_blind_spot_mismatch', severity: 'medium' });
  }

  return {
    alignment_score,
    kpi_mentions: mentions,
    kpi_count: list.length,
    contradictions,
    coherent: contradictions.length === 0 && (alignment_score >= 0.2 || list.length === 0)
  };
}

module.exports = { alignSummaryWithKpis };
