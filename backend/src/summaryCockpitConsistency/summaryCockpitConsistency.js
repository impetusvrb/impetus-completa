'use strict';

const { extractSummaryText } = require('../summaryConvergence/summaryTextExtractor');

function assessSummaryCockpitConsistency(summaryPayload = {}, ctx = {}) {
  const text = extractSummaryText(summaryPayload).toLowerCase();
  const kpis = Array.isArray(ctx.kpis) ? ctx.kpis : [];
  const kpiTitles = kpis.map((k) => String(k.title || k.label || k.key || '').toLowerCase()).filter(Boolean);
  const mentions = kpiTitles.filter((t) => t && text.includes(t.split('_')[0]?.slice(0, 4) || t.slice(0, 4)));
  const aligned = kpis.length === 0 || mentions.length > 0 || text.length < 20;

  return {
    kpi_count: kpis.length,
    narrative_kpi_mentions: mentions.length,
    cockpit_aligned: aligned,
    coherence_score: kpis.length ? mentions.length / Math.max(1, kpis.length) : 1
  };
}

module.exports = { assessSummaryCockpitConsistency };
