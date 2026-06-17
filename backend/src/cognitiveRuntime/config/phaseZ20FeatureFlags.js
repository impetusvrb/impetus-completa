'use strict';

function _flag(name, defaultVal = false) {
  const v = process.env[name];
  if (v == null || v === '') return defaultVal;
  return v === 'on' || v === 'true' || v === '1';
}

function _mode(name, defaultMode = 'off') {
  const v = String(process.env[name] || defaultMode).toLowerCase();
  if (v === 'shadow' || v === 'on' || v === 'enrich' || v === 'active') return v === 'active' ? 'on' : v;
  return 'off';
}

module.exports = {
  isQualityEngineBridgeEnabled: () =>
    _mode('IMPETUS_QUALITY_ENGINE_BRIDGE', 'off') !== 'off' || _flag('IMPETUS_SHADOW_ENRICHMENT', false),
  qualityEngineBridgeMode: () => _mode('IMPETUS_QUALITY_ENGINE_BRIDGE', 'shadow'),
  isShadowEnrichmentEnabled: () => _flag('IMPETUS_SHADOW_ENRICHMENT', true),
  isBindingValidationEnabled: () => _flag('IMPETUS_COGNITIVE_BINDING_VALIDATION', true),
  /** Invoca engines directamente no shadow bridge — não activa runtime cognitive global */
  allowDirectEngineInvocation: () => _flag('IMPETUS_QUALITY_BRIDGE_DIRECT_ENGINES', true),
  replaceLegacyCockpit: false,
  autoRemediation: false,
  autoExpansion: false
};
