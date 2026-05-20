'use strict';

const phaseX = require('./config/phaseXFeatureFlags');
const { logPhaseX } = require('./phaseXLogger');
const { extractKpiList, extractInsights } = require('./runtimePayloadUtils');

function analyzeOperationalSignalIntegrity(payload, ctx = {}) {
  const kpis = extractKpiList(payload);
  const insights = extractInsights(payload);
  const issues = [];

  for (const k of kpis) {
    const id = k.id || k.key || k.name;
    if (!k.source && !k.builder && !k.legacy && !k.provenance) {
      issues.push({ type: 'orphan_metric', kpi_id: id, severity: 'medium' });
    }
    if (k.value == null && k.current == null && !k.formatted) {
      issues.push({ type: 'empty_signal', kpi_id: id, severity: 'high' });
    }
    if (k.generic_fallback || k.placeholder) {
      issues.push({ type: 'weak_operational_signal', kpi_id: id, severity: 'medium' });
    }
  }

  for (const ins of insights) {
    const text = String(ins.text || ins.summary || ins.title || '');
    if (text.length < 40) issues.push({ type: 'low_insight_utility', insight_id: ins.id, severity: 'medium' });
    if (/em geral|sem alterações|situação normal/i.test(text)) {
      issues.push({ type: 'generic_insight', insight_id: ins.id, severity: 'low' });
    }
  }

  if (kpis.length === 0 && ctx.channel === 'kpi') {
    issues.push({ type: 'telemetry_gap', severity: 'high', channel: 'kpi' });
  }

  if (issues.some((i) => i.type === 'orphan_metric') && phaseX.isRuntimeEnrichmentObservabilityEnabled()) {
    logPhaseX('ORPHAN_METRIC_DETECTED', { count: issues.filter((i) => i.type === 'orphan_metric').length, shadow_only: true });
  }
  if (issues.some((i) => i.type === 'weak_operational_signal')) {
    logPhaseX('WEAK_OPERATIONAL_SIGNAL_DETECTED', { shadow_only: true });
  }

  const usefulness = kpis.length
    ? 1 - issues.filter((i) => i.severity === 'high').length / Math.max(kpis.length, 1)
    : 0.4;

  return {
    signal_integrity_score: Number(Math.max(0.35, usefulness).toFixed(4)),
    issues,
    kpi_count: kpis.length,
    insight_count: insights.length,
    invented_data: false,
    auto_remediate: false
  };
}

module.exports = { analyzeOperationalSignalIntegrity };
