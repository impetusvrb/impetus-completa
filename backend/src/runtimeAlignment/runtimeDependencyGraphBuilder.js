'use strict';

const DEPENDENCY_GRAPH = {
  widgets: {
    kpi_card: { depends_on: ['dashboardKPIs', 'secureKpiExposureResolver'], legacy: ['dashboardComposerService'] },
    summary_card: { depends_on: ['smartSummary', 'summaryExposureSanitizer'] },
    chat_widget: { depends_on: ['secureChatContextBuilder', 'governChatRequest'] },
    module_tile: { depends_on: ['semanticModulePublicationResolver', 'domainAuthority'] }
  },
  kpis: {
    dashboard_kpis: { depends_on: ['dashboardKPIs'], aggregators: ['corporate_metrics'] },
    governed_kpis: { depends_on: ['secureKpiExposureResolver', 'resolveContentExposure'] }
  },
  summaries: {
    smart_summary: { depends_on: ['smartSummary'], enrichers: ['personalizedInsightsService'] },
    governed_summary: { depends_on: ['summaryExposureSanitizer'] }
  }
};

function buildDependencyGraph() {
  return {
    graph: DEPENDENCY_GRAPH,
    built_at: new Date().toISOString(),
    hidden_dependencies: [
      { from: 'kpi_card', to: 'corporate_metrics', risk: 'legacy_aggregator' },
      { from: 'summary_card', to: 'smartSummary', risk: 'legacy_enricher' }
    ]
  };
}

module.exports = { buildDependencyGraph, DEPENDENCY_GRAPH };
