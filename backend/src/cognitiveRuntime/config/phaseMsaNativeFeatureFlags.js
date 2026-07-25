'use strict';

/**
 * GF-008 — Feature flags msa_native (foundation).
 * Default: off / inactive até GF-010+.
 */

function _flag(name, defaultVal = false) {
  const v = process.env[name];
  if (v == null || v === '') return defaultVal;
  return v === 'on' || v === 'true' || v === '1';
}

function _mode(name, defaultMode = 'off') {
  const v = String(process.env[name] || defaultMode).toLowerCase();
  if (['on', 'shadow', 'controlled', 'pilot', 'msa_native', 'active'].includes(v)) {
    return v === 'on' ? 'msa_native' : v;
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
  msaNativeCockpitMode: () => _mode('IMPETUS_MSA_NATIVE_COCKPIT', 'off'),
  isMsaNativeCockpitPilot: () => {
    const m = String(process.env.IMPETUS_MSA_NATIVE_COCKPIT || 'off').toLowerCase();
    return m === 'pilot' || m === 'on' || m === 'msa_native';
  },
  isMsaCognitiveRuntimeActive: () => {
    const m = _mode('IMPETUS_MSA_COGNITIVE_RUNTIME_ENABLED', 'off');
    return m === 'msa_native' || m === 'shadow' || m === 'controlled' || m === 'active';
  },
  isMsaCognitiveRuntimeShadow: () =>
    _mode('IMPETUS_MSA_COGNITIVE_RUNTIME_ENABLED', 'off') === 'shadow',
  isMsaRenderPromotionControlled: () => {
    const m = _mode('IMPETUS_MSA_RENDER_PROMOTION', 'off');
    return m === 'controlled' || m === 'pilot';
  },
  isMsaFoundationAttachmentEnabled: () => _flag('IMPETUS_MSA_RUNTIME_FOUNDATION', true),
  pilotProfiles: () => PILOT_PROFILES,
  isPilotProfile: (code) => {
    const pc = String(code || '').toLowerCase();
    return (
      PILOT_PROFILES.some((p) => pc === p || pc.includes(p)) ||
      pc.includes('quality') ||
      pc.includes('qualidade') ||
      pc.includes('msa') ||
      pc.includes('metrology') ||
      pc.includes('metrologia')
    );
  },
  maxCenters: () => 8,
  maxWidgets: () => 8,
  globalReplace: false,
  autoRemediation: false
};
