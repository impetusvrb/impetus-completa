'use strict';

const phaseY = require('./config/phaseYFeatureFlags');
const { logPhaseY } = require('./phaseYLogger');

const PHASE_BLOCKS = [
  { id: 'precision_delivery', phase: 'L' },
  { id: 'cognitive_convergence', phase: 'M' },
  { id: 'enterprise_cognitive_operations', phase: 'N' },
  { id: 'runtime_stabilization', phase: 'O' },
  { id: 'contextual_delivery', phase: 'P' },
  { id: 'runtime_consistency', phase: 'Q' },
  { id: 'decision_reliability', phase: 'R' },
  { id: 'controlled_activation', phase: 'S' },
  { id: 'kpi_governance', phase: 'T' },
  { id: 'kpi_runtime_stabilization', phase: 'U' },
  { id: 'summary_governance', phase: 'V' },
  { id: 'runtime_enrichment', phase: 'X' }
];

function advisePipelineConsolidation(ctx = {}) {
  const present = PHASE_BLOCKS.filter((p) => ctx[p.id] != null);
  const redundancies = [];

  if (ctx.runtime_stabilization && ctx.kpi_runtime_stabilization) {
    redundancies.push({ type: 'stabilization_overlap', phases: ['O', 'U'], severity: 'low' });
  }
  if (ctx.runtime_enrichment && ctx.precision_delivery) {
    redundancies.push({ type: 'enrichment_precision_overlap', phases: ['L', 'X'], severity: 'low' });
  }
  if (ctx.contextual_delivery && ctx.runtime_consistency) {
    redundancies.push({ type: 'delivery_consistency_shadow', phases: ['P', 'Q'], severity: 'low' });
  }
  if (present.length > 8) {
    redundancies.push({ type: 'shadow_duplication_pressure', count: present.length, severity: 'medium' });
  }

  if (redundancies.length && phaseY.isRuntimeCalibrationObservabilityEnabled()) {
    logPhaseY('PIPELINE_REDUNDANCY_DETECTED', { count: redundancies.length, shadow_only: true });
  }

  return {
    active_phase_blocks: present.length,
    present_phases: present.map((p) => p.phase),
    redundancies,
    legacy_pipelines_preserved: true,
    auto_remove: false,
    consolidation_recommendations: redundancies.length
      ? ['Documentar matriz de responsabilidade por fase; não remover pipelines em produção sem plano']
      : [],
    enforcement_active: phaseY.isPipelineConsolidationAnalysisEnabled()
  };
}

module.exports = { advisePipelineConsolidation };
