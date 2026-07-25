'use strict';

/**
 * GF-001 — Feature flags ppap_native (foundation).
 * Default: off / inactive até GF-003+.
 */

function _flag(name, defaultVal = false) {
  const v = process.env[name];
  if (v == null || v === '') return defaultVal;
  return v === 'on' || v === 'true' || v === '1';
}

function _mode(name, defaultMode = 'off') {
  const v = String(process.env[name] || defaultMode).toLowerCase();
  if (['on', 'shadow', 'controlled', 'pilot', 'ppap_native', 'active'].includes(v)) {
    return v === 'on' ? 'ppap_native' : v;
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
  ppapNativeCockpitMode: () => _mode('IMPETUS_PPAP_NATIVE_COCKPIT', 'off'),
  isPpapNativeCockpitPilot: () => {
    const m = String(process.env.IMPETUS_PPAP_NATIVE_COCKPIT || 'off').toLowerCase();
    return m === 'pilot' || m === 'on' || m === 'ppap_native';
  },
  isPpapCognitiveRuntimeActive: () => {
    const m = _mode('IMPETUS_PPAP_COGNITIVE_RUNTIME_ENABLED', 'off');
    return m === 'ppap_native' || m === 'shadow' || m === 'controlled' || m === 'active';
  },
  isPpapCognitiveRuntimeShadow: () =>
    _mode('IMPETUS_PPAP_COGNITIVE_RUNTIME_ENABLED', 'off') === 'shadow',
  isPpapRenderPromotionControlled: () => {
    const m = _mode('IMPETUS_PPAP_RENDER_PROMOTION', 'off');
    return m === 'controlled' || m === 'pilot';
  },
  isPpapFoundationAttachmentEnabled: () => _flag('IMPETUS_PPAP_RUNTIME_FOUNDATION', true),
  pilotProfiles: () => PILOT_PROFILES,
  isPilotProfile: (code) => {
    const pc = String(code || '').toLowerCase();
    return (
      PILOT_PROFILES.some((p) => pc === p || pc.includes(p)) ||
      pc.includes('quality') ||
      pc.includes('qualidade') ||
      pc.includes('ppap')
    );
  },
  maxCenters: () => 8,
  maxWidgets: () => 8,
  globalReplace: false,
  autoRemediation: false
};
