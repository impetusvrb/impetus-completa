'use strict';

const LEGACY_OVERLAPS = [
  { legacy: 'smart_summary_enricher', governed: 'unified_summary_truth_resolver' },
  { legacy: 'contextual_modules', governed: 'semantic_module_publication' },
  { legacy: 'dashboard_kpi_builder', governed: 'precise_kpi_resolver' }
];

function detectLegacyOverlap(ctx = {}) {
  const hits = [];
  if (ctx.has_legacy_summary) hits.push(LEGACY_OVERLAPS[0]);
  if (ctx.has_contextual_modules) hits.push(LEGACY_OVERLAPS[1]);
  if (ctx.has_legacy_kpi) hits.push(LEGACY_OVERLAPS[2]);
  return { legacy_overlaps: hits, count: hits.length, auto_deprecate: false };
}

module.exports = { detectLegacyOverlap, LEGACY_OVERLAPS };
