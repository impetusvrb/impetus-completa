'use strict';

const flags = require('./config/runtimeConsolidationFeatureFlags');
const { logRuntimeConsolidation } = require('./runtimeConsolidationLogger');
const { recordConsolidationAnalysis } = require('./runtimeConsolidationTelemetry');

const LEGACY_RESOLVER_HINTS = [
  { pattern: 'legacy', type: 'legacy_heuristic', severity: 'medium' },
  { pattern: 'fallback', type: 'fallback_resolver', severity: 'low' },
  { pattern: 'shadow', type: 'shadow_resolver', severity: 'low' },
  { pattern: 'deprecated', type: 'deprecated_builder', severity: 'high' }
];

const KNOWN_LEGACY_BLOCKS = [
  { id: 'semantic_enrichment', note: 'pre-X semantic path; prefer runtime_enrichment' },
  { id: 'operational_signal_quality', note: 'parallel signal path; consolidate under enrichment' },
  { id: 'kpi_hierarchy_delivery_integrity', note: 'overlap with kpi_runtime_stabilization' }
];

function analyzeLegacyResolvers(ctx = {}) {
  const legacy_heuristics = [];
  const redundant_resolvers = [];
  const obsolete_builders = [];

  for (const block of KNOWN_LEGACY_BLOCKS) {
    if (ctx[block.id] != null) {
      legacy_heuristics.push({ block: block.id, note: block.note, severity: 'medium' });
    }
  }

  if (ctx.precision_delivery && ctx.runtime_enrichment && !ctx.runtime_enrichment.consolidated) {
    redundant_resolvers.push({
      resolver: 'precision_delivery + runtime_enrichment',
      recommendation: 'Unificar facade de enrichment (documentar antes de migrar)'
    });
  }

  if (ctx.summary_governance && ctx.summary_relevance) {
    redundant_resolvers.push({
      resolver: 'summary_governance + summary_relevance',
      recommendation: 'Avaliar merge em summaryRolloutFacade'
    });
  }

  const ctxKeys = Object.keys(ctx);
  for (const key of ctxKeys) {
    for (const hint of LEGACY_RESOLVER_HINTS) {
      if (key.toLowerCase().includes(hint.pattern)) {
        obsolete_builders.push({ key, type: hint.type, severity: hint.severity });
      }
    }
  }

  if (ctx._legacyResolverFlags?.length) {
    for (const f of ctx._legacyResolverFlags) {
      legacy_heuristics.push({ flag: f, source: 'explicit' });
    }
  }

  const total = legacy_heuristics.length + redundant_resolvers.length + obsolete_builders.length;

  if (total > 0 && flags.isRuntimeConsolidationObservabilityEnabled()) {
    logRuntimeConsolidation('LEGACY_RESOLVER_DETECTED', { count: total, shadow_only: true });
  }

  recordConsolidationAnalysis({ legacy: total });

  return {
    legacy_heuristics,
    redundant_resolvers,
    obsolete_builders,
    legacy_total: total,
    auto_remove: false,
    analysis_only: !flags.isLegacyReductionAnalysisEnabled()
  };
}

module.exports = { analyzeLegacyResolvers };
