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
  isCompositionEngineEnabled: () => _flag('IMPETUS_COGNITIVE_COMPOSITION_ENGINE', false),
  qualityCockpitPilotMode: () => _mode('IMPETUS_QUALITY_COCKPIT_PILOT', 'off'),
  qualityCockpitMode: () => _mode('IMPETUS_COGNITIVE_COCKPIT_QUALITY', 'off'),
  isQualityCockpitShadowActive: () => {
    const p = _mode('IMPETUS_QUALITY_COCKPIT_PILOT', 'off');
    const q = _mode('IMPETUS_COGNITIVE_COCKPIT_QUALITY', 'off');
    return p === 'shadow' || q === 'shadow' || _flag('IMPETUS_COGNITIVE_COMPOSITION_ENGINE', false);
  },
  isCompositionObservabilityEnabled: () =>
    _flag('IMPETUS_COGNITIVE_COMPOSITION_OBSERVABILITY', true),
  replaceLegacyCockpit: false,
  autoRemediation: false,
  autoExpansion: false,
  removeLegacyWidgets: false
};
