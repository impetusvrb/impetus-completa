'use strict';

/**
 * GF-015 — Feature flags ishikawa_native (foundation).
 * Default: off / inactive até GF-017+.
 */

function _flag(name, defaultVal = false) {
  const v = process.env[name];
  if (v == null || v === '') return defaultVal;
  return v === 'on' || v === 'true' || v === '1';
}

function _mode(name, defaultMode = 'off') {
  const v = String(process.env[name] || defaultMode).toLowerCase();
  if (['on', 'shadow', 'controlled', 'pilot', 'ishikawa_native', 'active'].includes(v)) {
    return v === 'on' ? 'ishikawa_native' : v;
  }
  return 'off';
}

const PILOT_PROFILES = Object.freeze([
  'coordinator_quality',
  'manager_quality',
  'supervisor_quality',
  'inspector_quality'
]);

module.exports = {
  ishikawaNativeCockpitMode: () => _mode('IMPETUS_ISHIKAWA_NATIVE_COCKPIT', 'off'),
  isIshikawaNativeCockpitPilot: () => {
    const m = String(process.env.IMPETUS_ISHIKAWA_NATIVE_COCKPIT || 'off').toLowerCase();
    return m === 'pilot' || m === 'on' || m === 'ishikawa_native';
  },
  isIshikawaCognitiveRuntimeActive: () => {
    const m = _mode('IMPETUS_ISHIKAWA_COGNITIVE_RUNTIME_ENABLED', 'off');
    return m === 'ishikawa_native' || m === 'shadow' || m === 'controlled' || m === 'active';
  },
  isIshikawaCognitiveRuntimeShadow: () =>
    _mode('IMPETUS_ISHIKAWA_COGNITIVE_RUNTIME_ENABLED', 'off') === 'shadow',
  isIshikawaRenderPromotionControlled: () => {
    const m = _mode('IMPETUS_ISHIKAWA_RENDER_PROMOTION', 'off');
    return m === 'controlled' || m === 'pilot';
  },
  isIshikawaFoundationAttachmentEnabled: () => _flag('IMPETUS_ISHIKAWA_RUNTIME_FOUNDATION', true),
  pilotProfiles: () => PILOT_PROFILES,
  isPilotProfile: (code) => {
    const pc = String(code || '').toLowerCase();
    return (
      PILOT_PROFILES.some((p) => pc === p || pc.includes(p)) ||
      pc.includes('quality') ||
      pc.includes('qualidade') ||
      pc.includes('ishikawa') ||
      pc.includes('capa') ||
      pc.includes('rca')
    );
  },
  maxCenters: () => 8,
  maxWidgets: () => 8,
  globalReplace: false,
  autoRemediation: false
};
