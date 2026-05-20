'use strict';

const phaseK = require('../semanticGovernance/config/phaseKFeatureFlags');
const { detectOrphanPipelines } = require('./orphanPipelineDetector');

let _metrics = {
  publication_leakage_count: 0,
  orphan_pipeline_count: 0,
  governed_card_alignment: 1,
  contextual_consistency_rate: 1,
  semantic_publication_integrity: 1,
  runtime_semantic_health: 'healthy',
  legacy_dependency_score: 0
};

function recordLeakage(count = 1) {
  _metrics.publication_leakage_count += count;
  _recompute();
}

function recordCardAlignment(score) {
  _metrics.governed_card_alignment = Number(score.toFixed(4));
  _recompute();
}

function _recompute() {
  const orphans = detectOrphanPipelines({ force: phaseK.isSemanticRuntimeObservabilityEnabled() });
  _metrics.orphan_pipeline_count = orphans.orphan_count || 0;
  _metrics.legacy_dependency_score = Number(
    Math.min(1, (_metrics.orphan_pipeline_count + _metrics.publication_leakage_count) / 50).toFixed(4)
  );
  _metrics.semantic_publication_integrity = Number(
    Math.max(0, 1 - _metrics.publication_leakage_count * 0.05 - _metrics.legacy_dependency_score * 0.3).toFixed(4)
  );
  _metrics.contextual_consistency_rate = _metrics.semantic_publication_integrity;
  _metrics.runtime_semantic_health =
    _metrics.semantic_publication_integrity >= 0.85 ? 'healthy' :
    _metrics.semantic_publication_integrity >= 0.65 ? 'watch' : 'degraded';
}

function getSemanticTelemetry() {
  _recompute();
  return { ..._metrics, observed_at: new Date().toISOString() };
}

function resetForTests() {
  _metrics = {
    publication_leakage_count: 0,
    orphan_pipeline_count: 0,
    governed_card_alignment: 1,
    contextual_consistency_rate: 1,
    semantic_publication_integrity: 1,
    runtime_semantic_health: 'healthy',
    legacy_dependency_score: 0
  };
}

module.exports = { recordLeakage, recordCardAlignment, getSemanticTelemetry, resetForTests };
