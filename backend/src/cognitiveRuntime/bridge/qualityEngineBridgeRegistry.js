'use strict';

/**
 * Mapa block_id → engine bridge handler (Z.20).
 * engine_ref alinhado ao roadmap e qualityCognitiveBlockPack.
 */
const QUALITY_BLOCK_BRIDGE_MAP = Object.freeze({
  'quality.nc_center': {
    engine_ref: 'quality.nc_events',
    handler: 'bindNcCenter',
    requires_db: true
  },
  'quality.capa_engine': {
    engine_ref: 'quality.capa_workflow',
    handler: 'bindCapaEngine',
    requires_db: true
  },
  'quality.spc_monitor': {
    engine_ref: 'domains/quality/cognitive/drift/qualityDriftPredictionEngine',
    handler: 'bindSpcMonitor',
    min_process_points: 8
  },
  'quality.audit_governance': {
    engine_ref: 'domains/quality/cognitive/audit/qualityCognitiveAuditEnvelope',
    handler: 'bindAuditGovernance',
    requires_db: true
  },
  'quality.supplier_intelligence': {
    engine_ref: 'domains/quality/cognitive/supplier/qualitySupplierScoringEngine',
    handler: 'bindSupplierIntelligence',
    min_supplier_rows: 2
  },
  'quality.contextual_quality_ai': {
    engine_ref: 'domains/quality/cognitive/orchestration/qualityCognitiveOrchestrator',
    handler: 'bindContextualQualityAi'
  },
  'quality.quality_narrative': {
    engine_ref: 'domains/quality/cognitive/narratives/qualityExecutiveNarrativeEngine',
    handler: 'bindQualityNarrative'
  },
  'quality.process_stability': {
    engine_ref: 'domains/quality/cognitive/deterioration/qualityProcessDeteriorationEngine',
    handler: 'bindProcessStability',
    min_process_points: 10
  },
  'quality.nonconformity_heatmap': {
    engine_ref: 'quality.nc_heatmap',
    handler: 'bindNonconformityHeatmap',
    requires_db: true
  },
  'quality.recurrence_analysis': {
    engine_ref: 'domains/quality/cognitive/recurrence/qualityRecurrenceAnalysisEngine',
    handler: 'bindRecurrenceAnalysis',
    min_records: 2
  },
  'quality.supplier_quality': { alias_of: 'quality.supplier_intelligence' },
  'quality.contextual_ai': { alias_of: 'quality.contextual_quality_ai' }
});

function resolveBridgeConfig(blockId) {
  const id = String(blockId || '');
  const entry = QUALITY_BLOCK_BRIDGE_MAP[id];
  if (!entry) return null;
  if (entry.alias_of) return QUALITY_BLOCK_BRIDGE_MAP[entry.alias_of];
  return entry;
}

function listBridgeableQualityBlocks() {
  return Object.keys(QUALITY_BLOCK_BRIDGE_MAP).filter((k) => !QUALITY_BLOCK_BRIDGE_MAP[k].alias_of);
}

module.exports = {
  QUALITY_BLOCK_BRIDGE_MAP,
  resolveBridgeConfig,
  listBridgeableQualityBlocks
};
