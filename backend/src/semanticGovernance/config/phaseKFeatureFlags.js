'use strict';

function _flag(name, defaultOn = false) {
  const v = process.env[name];
  if (v === undefined || v === null || v === '') return defaultOn;
  return String(v).toLowerCase() === 'on' || String(v) === '1' || String(v) === 'true';
}

module.exports = {
  isSemanticPublicationGovernanceEnabled: () => _flag('IMPETUS_SEMANTIC_PUBLICATION_GOVERNANCE', false),
  isRuntimeAlignmentAuditEnabled: () => _flag('IMPETUS_RUNTIME_ALIGNMENT_AUDIT', false),
  isOrphanPipelineDetectionEnabled: () => _flag('IMPETUS_ORPHAN_PIPELINE_DETECTION', false),
  isGovernedCardOrchestrationEnabled: () => _flag('IMPETUS_GOVERNED_CARD_ORCHESTRATION', false),
  isContextualFallbackSanitizationEnabled: () => _flag('IMPETUS_CONTEXTUAL_FALLBACK_SANITIZATION', false),
  isSemanticRuntimeObservabilityEnabled: () => _flag('IMPETUS_SEMANTIC_RUNTIME_OBSERVABILITY', true)
};
