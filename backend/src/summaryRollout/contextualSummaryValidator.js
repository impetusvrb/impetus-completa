'use strict';

const { extractSummaryMeta } = require('./summaryPayloadUtils');
const { normalizeAxis } = require('../kpiRollout/kpiDomainRegistry');

const EXECUTIVE_MARKERS = /\b(diretoria|conselho|ebitda|estratégia corporativa|board)\b/i;
const OPERATIONAL_MARKERS = /\b(linha|turno|oee|operador|chão de fábrica)\b/i;

function validateContextualSummary(user, summaryPayload, ctx = {}) {
  const meta = extractSummaryMeta(summaryPayload);
  const userAxis = normalizeAxis(ctx.functional_axis || user?.functional_axis || user?.functional_area);
  const issues = [];
  let score = 0.85;

  if (!meta.text || meta.text.length < 40) {
    issues.push({ type: 'summary_insufficient', severity: 'high' });
    score -= 0.25;
  }
  if (meta.stale) {
    issues.push({ type: 'stale_contextual_summary', severity: 'medium' });
    score -= 0.1;
  }
  if (userAxis === 'general' || !userAxis) {
    issues.push({ type: 'contextual_ambiguity', severity: 'medium' });
    score -= 0.15;
  }
  if (EXECUTIVE_MARKERS.test(meta.text) && ['operator', 'supervisor'].includes(ctx.hierarchy_band)) {
    issues.push({ type: 'executive_narrative_leakage', severity: 'critical' });
    score -= 0.3;
  }
  if (OPERATIONAL_MARKERS.test(meta.text) && ctx.hierarchy_band === 'executive') {
    issues.push({ type: 'operational_narrative_leakage', severity: 'high' });
    score -= 0.2;
  }

  return {
    valid: issues.filter((i) => i.severity === 'critical').length === 0,
    contextual_alignment_score: Number(Math.max(0, score).toFixed(4)),
    issues
  };
}

module.exports = { validateContextualSummary };
