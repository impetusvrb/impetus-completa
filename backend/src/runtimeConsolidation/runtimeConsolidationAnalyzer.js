'use strict';

const flags = require('./config/runtimeConsolidationFeatureFlags');
const { logRuntimeConsolidation } = require('./runtimeConsolidationLogger');
const { recordConsolidationAnalysis } = require('./runtimeConsolidationTelemetry');

const OVERLAP_RULES = [
  {
    type: 'stabilization_overlap',
    keys: ['runtime_stabilization', 'kpi_runtime_stabilization'],
    phases: ['O', 'U'],
    severity: 'low'
  },
  {
    type: 'enrichment_precision_overlap',
    keys: ['runtime_enrichment', 'precision_delivery'],
    phases: ['L', 'X'],
    severity: 'low'
  },
  {
    type: 'delivery_consistency_shadow',
    keys: ['contextual_delivery', 'runtime_consistency'],
    phases: ['P', 'Q'],
    severity: 'low'
  },
  {
    type: 'calibration_tuning_overlap',
    keys: ['runtime_calibration', 'runtime_tuning'],
    phases: ['Y', 'ZT'],
    severity: 'low'
  },
  {
    type: 'governance_rollout_overlap',
    keys: ['controlled_activation', 'tenant_rollout'],
    phases: ['S', 'TR'],
    severity: 'medium'
  }
];

function analyzeRuntimeConsolidation(ctx = {}) {
  let phaseY = null;
  try {
    phaseY = require('../runtimeCalibration/pipelineConsolidationAdvisor').advisePipelineConsolidation(ctx);
  } catch {
    phaseY = { redundancies: [], active_phase_blocks: 0 };
  }

  const redundancies = [...(phaseY.redundancies || [])];
  const overlaps = [];
  const shadow_duplication = [];

  for (const rule of OVERLAP_RULES) {
    if (rule.keys.every((k) => ctx[k] != null)) {
      overlaps.push({
        type: rule.type,
        phases: rule.phases,
        severity: rule.severity,
        pipelines: rule.keys
      });
    }
  }

  const activeCount =
    phaseY.active_phase_blocks ??
    Object.keys(ctx).filter((k) => ctx[k] != null && !k.startsWith('_')).length;

  if (activeCount > 8) {
    shadow_duplication.push({
      type: 'shadow_duplication_pressure',
      active_blocks: activeCount,
      severity: 'medium'
    });
  }

  const duplicate_pipelines = overlaps.filter((o) =>
    ['enrichment_precision_overlap', 'stabilization_overlap'].includes(o.type)
  );

  const total = redundancies.length + overlaps.length + shadow_duplication.length;

  if (total > 0 && flags.isRuntimeConsolidationObservabilityEnabled()) {
    logRuntimeConsolidation('PIPELINE_REDUNDANCY_DETECTED', { count: total, shadow_only: true });
  }
  if (shadow_duplication.length && flags.isRuntimeConsolidationObservabilityEnabled()) {
    logRuntimeConsolidation('SHADOW_DUPLICATION_DETECTED', {
      active_blocks: activeCount,
      shadow_only: true
    });
  }

  recordConsolidationAnalysis({ redundancies: total });

  return {
    redundancies,
    overlaps,
    duplicate_pipelines,
    shadow_duplication,
    active_phase_blocks: activeCount,
    overlap_total: overlaps.length,
    redundancy_total: total,
    legacy_pipelines_preserved: true,
    auto_remove: false,
    recommendation_only: true
  };
}

module.exports = { analyzeRuntimeConsolidation };
