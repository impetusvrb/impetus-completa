'use strict';

function _flag(name, defaultVal = false) {
  const v = process.env[name];
  if (v == null || v === '') return defaultVal;
  return v === 'on' || v === 'true' || v === '1';
}

module.exports = {
  isCognitiveRuntimeEnabled: () => _flag('IMPETUS_COGNITIVE_RUNTIME', false),
  isCognitiveBlockRegistryEnabled: () => _flag('IMPETUS_COGNITIVE_BLOCK_REGISTRY', false),
  isCognitiveCompositionShadowEnabled: () => _flag('IMPETUS_COGNITIVE_COMPOSITION_SHADOW', false),
  isSemanticDeliveryObservabilityEnabled: () =>
    _flag('IMPETUS_SEMANTIC_DELIVERY_OBSERVABILITY', true),
  isCognitiveRuntimeValidationEnabled: () => _flag('IMPETUS_COGNITIVE_RUNTIME_VALIDATION', false),
  /** Nunca activar em Z.18 — reservado para fases futuras */
  autoComposeCockpit: false,
  autoRemediation: false,
  globalAutoPruning: false,
  chatEnforcement: false,
  boundaryEnforcement: false,
  replaceDashboardDelivery: false
};
