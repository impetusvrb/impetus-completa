'use strict';

const phaseX = require('./config/phaseXFeatureFlags');
const { logPhaseX } = require('./phaseXLogger');
const { normalizeAxis } = require('../kpiRollout/kpiDomainRegistry');

function validateContextualEnrichment(payload, ctx = {}) {
  const axis = normalizeAxis(ctx.functional_axis || payload?.functional_axis);
  const issues = [];
  const blocks = [
    ctx.precision_delivery,
    ctx.contextual_delivery,
    ctx.kpi_governance,
    ctx.summary_governance,
    ctx.chat_alignment
  ].filter(Boolean);

  if (blocks.length < 2) {
    issues.push({ type: 'enrichment_incomplete', severity: 'low' });
  }

  const axes = new Set(
    blocks
      .map((b) => b.functional_axis || b.canonical_axis || b.operational_axis)
      .filter(Boolean)
      .map((a) => normalizeAxis(a))
  );
  if (axes.size > 1 && !axes.has(axis) && axis !== 'general') {
    issues.push({ type: 'runtime_enrichment_inconsistency', severity: 'high', axes: [...axes] });
    logPhaseX('RUNTIME_ENRICHMENT_INCONSISTENCY', { axes: [...axes], shadow_only: true });
  }

  const coherent = issues.filter((i) => i.severity === 'critical').length === 0;
  return {
    enrichment_integrity_score: coherent ? 0.9 : Math.max(0.45, 0.9 - issues.length * 0.1),
    valid: coherent,
    issues,
    hierarchy_respected: true,
    leakage_free: !issues.some((i) => i.type === 'runtime_enrichment_inconsistency'),
    auto_correct: false,
    enforcement_active: phaseX.isRuntimeEnrichmentEnabled()
  };
}

module.exports = { validateContextualEnrichment };
