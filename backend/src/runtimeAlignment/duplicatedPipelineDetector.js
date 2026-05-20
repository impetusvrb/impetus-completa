'use strict';

const { logPhaseK } = require('../semanticGovernance/phaseKLogger');
const phaseK = require('../semanticGovernance/config/phaseKFeatureFlags');

const PIPELINE_GROUPS = [
  {
    channel: 'chat',
    pipelines: ['secureChatContextBuilder', 'governChatRequest', 'openaiVozService']
  },
  {
    channel: 'kpi',
    pipelines: ['secureKpiExposureResolver', 'dashboardKPIs', 'dashboardComposerService']
  },
  {
    channel: 'summary',
    pipelines: ['summaryExposureSanitizer', 'smartSummary']
  }
];

function detectDuplicatedPipelines(ctx = {}) {
  if (!phaseK.isOrphanPipelineDetectionEnabled() && !ctx.force) {
    return { enabled: false, duplicates: [] };
  }

  const duplicates = PIPELINE_GROUPS.filter((g) => g.pipelines.length > 1).map((g) => ({
    channel: g.channel,
    pipelines: g.pipelines,
    risk: 'parallel_resolution_paths'
  }));

  for (const d of duplicates) {
    logPhaseK('DUPLICATED_CONTEXT_BUILDER', { channel: d.channel, pipelines: d.pipelines });
  }

  return { enabled: true, duplicates };
}

module.exports = { detectDuplicatedPipelines, PIPELINE_GROUPS };
